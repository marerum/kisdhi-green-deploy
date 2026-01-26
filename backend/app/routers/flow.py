"""
Flow management API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from ..database import get_db
from ..models import Project, HearingLog, FlowNode, FlowEdge
from ..utils.sanitizer import sanitize_flow_nodes, sanitize_flow_edges
from ..schemas import (
    FlowNodeResponse, FlowNodeCreate, FlowNodeUpdate, 
    FlowReorderRequest, FlowGenerationResponse, FlowEdgeResponse,
    FlowSaveRequest
)
from typing import Dict, Any, Optional
from ..services.ai import ai_service

logger = logging.getLogger(__name__)

# Simple in-memory undo tracking (per project)
# In production, this could be stored in Redis or database
undo_history: Dict[int, Dict[str, Any]] = {}


def _record_undo_operation(project_id: int, operation: str, data: Dict[str, Any]):
    """Record an operation for potential undo."""
    undo_history[project_id] = {
        "operation": operation,
        "data": data
    }


def _clear_undo_history(project_id: int):
    """Clear undo history for a project."""
    if project_id in undo_history:
        del undo_history[project_id]

router = APIRouter(
    prefix="/api",
    tags=["flow"]
)


@router.post("/projects/{project_id}/flow/generate", response_model=FlowGenerationResponse)
async def generate_flow(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate a business flow from project hearing logs using AI.
    
    Args:
        project_id: ID of the project to generate flow for
        db: Database session
        
    Returns:
        Generated flow data including actors, steps, and flow nodes
        
    Raises:
        HTTPException: If project not found, no hearing logs, or AI generation fails
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found"
        )
    
    # Get hearing logs for the project
    hearing_logs = db.query(HearingLog).filter(
        HearingLog.project_id == project_id
    ).order_by(HearingLog.created_at).all()
    
    if not hearing_logs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hearing logs found for this project. Add hearing content before generating flow."
        )
    
    # Extract hearing log content
    hearing_content = [log.content for log in hearing_logs]
    
    try:
        # Generate flow using AI service
        flow_data = await ai_service.generate_business_flow(hearing_content)
        
        # Clear existing flow nodes and edges for this project
        db.query(FlowEdge).filter(FlowEdge.project_id == project_id).delete()
        db.query(FlowNode).filter(FlowNode.project_id == project_id).delete()
        
        # Create new flow nodes from AI response
        created_nodes = []
        for node_data in flow_data["flow_nodes"]:
            flow_node = FlowNode(
                project_id=project_id,
                text=node_data["text"],
                order=node_data["order"],
                actor=node_data.get("actor"),
                step=node_data.get("step"),
                position_x=node_data.get("position_x"),
                position_y=node_data.get("position_y")
            )
            db.add(flow_node)
            created_nodes.append(flow_node)
        
        # Commit the transaction to get node IDs
        db.commit()
        
        # Refresh nodes to get IDs and timestamps
        for node in created_nodes:
            db.refresh(node)
        
        # Create flow edges from AI response if provided
        created_edges = []
        if "edges" in flow_data and flow_data["edges"]:
            for edge_data in flow_data["edges"]:
                flow_edge = FlowEdge(
                    project_id=project_id,
                    from_node_order=edge_data["from_order"],
                    to_node_order=edge_data["to_order"],
                    condition=edge_data.get("condition")
                )
                db.add(flow_edge)
                created_edges.append(flow_edge)
            
            db.commit()
            for edge in created_edges:
                db.refresh(edge)
        
        logger.info(f"Generated {len(created_nodes)} flow nodes and {len(created_edges)} edges for project {project_id}")
        
        # Sanitize HTTP URLs to HTTPS for Mixed Content compliance
        sanitize_flow_nodes(created_nodes)
        sanitize_flow_edges(created_edges)
        
        # Return the complete flow data
        return {
            "actors": flow_data["actors"],
            "steps": flow_data["steps"],
            "flow_nodes": created_nodes,
            "edges": created_edges
        }
        
    except ValueError as e:
        logger.error(f"Validation error during flow generation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Flow generation validation failed: {str(e)}"
        )
    except RuntimeError as e:
        logger.error(f"AI service error during flow generation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI flow generation failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during flow generation: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during flow generation"
        )


@router.get("/projects/{project_id}/flow", response_model=List[FlowNodeResponse])
async def get_flow_nodes(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all flow nodes for a project.
    
    Args:
        project_id: ID of the project
        db: Database session
        
    Returns:
        List of flow nodes ordered by sequence
        
    Raises:
        HTTPException: If project not found
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found"
        )
    
    # Get flow nodes for the project
    flow_nodes = db.query(FlowNode).filter(
        FlowNode.project_id == project_id
    ).order_by(FlowNode.order).all()
    
    # Sanitize HTTP URLs to HTTPS for Mixed Content compliance
    sanitize_flow_nodes(flow_nodes)
    
    return flow_nodes


@router.get("/projects/{project_id}/flow/complete")
async def get_complete_flow(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Get complete flow data including nodes and edges for a project.
    
    Args:
        project_id: ID of the project
        db: Database session
        
    Returns:
        Complete flow data with nodes and edges
        
    Raises:
        HTTPException: If project not found
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found"
        )
    
    # Get flow nodes for the project
    flow_nodes = db.query(FlowNode).filter(
        FlowNode.project_id == project_id
    ).order_by(FlowNode.order).all()
    
    # Get flow edges for the project
    flow_edges = db.query(FlowEdge).filter(
        FlowEdge.project_id == project_id
    ).order_by(FlowEdge.from_node_order, FlowEdge.to_node_order).all()
    
    # Sanitize HTTP URLs to HTTPS for Mixed Content compliance
    sanitize_flow_nodes(flow_nodes)
    sanitize_flow_edges(flow_edges)
    
    return {
        "flow_nodes": flow_nodes,
        "edges": flow_edges
    }


@router.put("/flow/nodes/{node_id}", response_model=FlowNodeResponse)
async def update_flow_node(
    node_id: int,
    node_update: FlowNodeUpdate,
    db: Session = Depends(get_db)
):
    """
    Update the content of a flow node.
    
    Args:
        node_id: ID of the flow node to update
        node_update: Updated node data
        db: Database session
        
    Returns:
        Updated flow node
        
    Raises:
        HTTPException: If node not found
    """
    # Find the flow node
    flow_node = db.query(FlowNode).filter(FlowNode.id == node_id).first()
    if not flow_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flow node with id {node_id} not found"
        )
    
    # Update the node text
    old_text = flow_node.text
    
    # Sanitize HTTP URLs to HTTPS for Mixed Content compliance
    from ..utils.sanitizer import sanitize_http_to_https
    flow_node.text = sanitize_http_to_https(node_update.text)
    
    try:
        db.commit()
        db.refresh(flow_node)
        
        # Record undo operation
        _record_undo_operation(flow_node.project_id, "update_node", {
            "node_id": node_id,
            "old_text": old_text
        })
        
        logger.info(f"Updated flow node {node_id}")
        return flow_node
    except Exception as e:
        logger.error(f"Error updating flow node {node_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update flow node"
        )


@router.post("/flow/nodes", response_model=FlowNodeResponse)
async def create_flow_node(
    node_create: FlowNodeCreate,
    db: Session = Depends(get_db)
):
    """
    Add a new flow node to a project.
    
    Args:
        node_create: New node data including project_id
        db: Database session
        
    Returns:
        Created flow node
        
    Raises:
        HTTPException: If project not found
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == node_create.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {node_create.project_id} not found"
        )
    
    # Create new flow node
    from ..utils.sanitizer import sanitize_http_to_https
    flow_node = FlowNode(
        project_id=node_create.project_id,
        text=sanitize_http_to_https(node_create.text),
        order=node_create.order
    )
    
    try:
        db.add(flow_node)
        db.commit()
        db.refresh(flow_node)
        
        # Record undo operation
        _record_undo_operation(node_create.project_id, "create_node", {
            "node_id": flow_node.id
        })
        
        logger.info(f"Created flow node for project {node_create.project_id}")
        return flow_node
    except Exception as e:
        logger.error(f"Error creating flow node for project {node_create.project_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create flow node"
        )


@router.post("/projects/{project_id}/flow/save")
async def save_flow(
    project_id: int,
    flow_save_request: FlowSaveRequest,
    db: Session = Depends(get_db)
):
    """
    Save flow edges for a project (preserving manual edits).
    
    Args:
        project_id: ID of the project
        flow_save_request: Flow data including edges
        db: Database session
        
    Returns:
        Success message with saved edges count
        
    Raises:
        HTTPException: If project not found
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found"
        )
    
    try:
        # Clear existing edges for this project
        db.query(FlowEdge).filter(FlowEdge.project_id == project_id).delete()
        
        # Create new edges
        from ..utils.sanitizer import sanitize_http_to_https
        created_edges = []
        for edge_data in flow_save_request.edges:
            flow_edge = FlowEdge(
                project_id=project_id,
                from_node_order=edge_data.from_node_order,
                to_node_order=edge_data.to_node_order,
                condition=sanitize_http_to_https(edge_data.condition)
            )
            db.add(flow_edge)
            created_edges.append(flow_edge)
        
        db.commit()
        
        logger.info(f"Saved {len(created_edges)} edges for project {project_id}")
        return {
            "message": "Flow saved successfully",
            "edges_count": len(created_edges)
        }
        
    except Exception as e:
        logger.error(f"Error saving flow for project {project_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save flow"
        )


@router.post("/projects/{project_id}/flow/nodes/save")
async def save_flow_nodes(
    project_id: int,
    nodes_data: List[dict],
    db: Session = Depends(get_db)
):
    """
    Save flow nodes for a project (batch save).
    
    Args:
        project_id: ID of the project
        nodes_data: List of node dictionaries with text, order, actor, step, position_x, position_y
        db: Database session
        
    Returns:
        Success message with saved nodes count
        
    Raises:
        HTTPException: If project not found
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found"
        )
    
    try:
        # Clear existing nodes for this project
        db.query(FlowNode).filter(FlowNode.project_id == project_id).delete()
        
        # Create new nodes
        created_nodes = []
        for node_data in nodes_data:
            flow_node = FlowNode(
                project_id=project_id,
                text=node_data.get('text', ''),
                order=node_data.get('order', 0),
                actor=node_data.get('actor', ''),
                step=node_data.get('step', ''),
                position_x=node_data.get('position_x', 0),
                position_y=node_data.get('position_y', 0)
            )
            db.add(flow_node)
            created_nodes.append(flow_node)
        
        db.commit()
        
        logger.info(f"Saved {len(created_nodes)} nodes for project {project_id}")
        return {
            "message": "Flow nodes saved successfully",
            "nodes_count": len(created_nodes)
        }
        
    except Exception as e:
        logger.error(f"Error saving flow nodes for project {project_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save flow nodes"
        )


@router.delete("/flow/nodes/{node_id}")
async def delete_flow_node(
    node_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a flow node.
    
    Args:
        node_id: ID of the flow node to delete
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If node not found
    """
    # Find the flow node
    flow_node = db.query(FlowNode).filter(FlowNode.id == node_id).first()
    if not flow_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flow node with id {node_id} not found"
        )
    
    try:
        # Record undo operation before deletion
        _record_undo_operation(flow_node.project_id, "delete_node", {
            "node_id": node_id,
            "text": flow_node.text,
            "order": flow_node.order,
            "project_id": flow_node.project_id
        })
        
        db.delete(flow_node)
        db.commit()
        logger.info(f"Deleted flow node {node_id}")
        return {"message": f"Flow node {node_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting flow node {node_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete flow node"
        )


@router.put("/projects/{project_id}/flow/reorder", response_model=List[FlowNodeResponse])
async def reorder_flow_nodes(
    project_id: int,
    reorder_request: FlowReorderRequest,
    db: Session = Depends(get_db)
):
    """
    Reorder flow nodes for a project.
    
    Args:
        project_id: ID of the project
        reorder_request: New node ordering
        db: Database session
        
    Returns:
        Updated flow nodes in new order
        
    Raises:
        HTTPException: If project not found or invalid node IDs
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found"
        )
    
    try:
        # Get current node orders for undo
        current_nodes = db.query(FlowNode).filter(
            FlowNode.project_id == project_id
        ).all()
        old_orders = {node.id: node.order for node in current_nodes}
        
        # Update each node's order
        for node_order in reorder_request.node_orders:
            node_id = node_order["id"]
            new_order = node_order["order"]
            
            # Find and update the node
            flow_node = db.query(FlowNode).filter(
                FlowNode.id == node_id,
                FlowNode.project_id == project_id
            ).first()
            
            if not flow_node:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Flow node with id {node_id} not found in project {project_id}"
                )
            
            flow_node.order = new_order
        
        db.commit()
        
        # Record undo operation
        _record_undo_operation(project_id, "reorder_nodes", {
            "old_orders": old_orders
        })
        
        # Return updated nodes in new order
        updated_nodes = db.query(FlowNode).filter(
            FlowNode.project_id == project_id
        ).order_by(FlowNode.order).all()
        
        logger.info(f"Reordered {len(reorder_request.node_orders)} flow nodes for project {project_id}")
        return updated_nodes
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Error reordering flow nodes for project {project_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder flow nodes"
        )


@router.post("/projects/{project_id}/flow/undo", response_model=List[FlowNodeResponse])
async def undo_flow_operation(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Undo the most recent flow operation for a project.
    
    Args:
        project_id: ID of the project
        db: Database session
        
    Returns:
        Updated flow nodes after undo operation
        
    Raises:
        HTTPException: If project not found or no operation to undo
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found"
        )
    
    # Check if there's an operation to undo
    if project_id not in undo_history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No operation to undo"
        )
    
    undo_data = undo_history[project_id]
    operation = undo_data["operation"]
    data = undo_data["data"]
    
    try:
        if operation == "create_node":
            # Undo node creation by deleting the node
            node_id = data["node_id"]
            flow_node = db.query(FlowNode).filter(FlowNode.id == node_id).first()
            if flow_node:
                db.delete(flow_node)
                
        elif operation == "delete_node":
            # Undo node deletion by recreating the node
            flow_node = FlowNode(
                project_id=data["project_id"],
                text=data["text"],
                order=data["order"]
            )
            db.add(flow_node)
            
        elif operation == "update_node":
            # Undo node update by restoring old text
            node_id = data["node_id"]
            flow_node = db.query(FlowNode).filter(FlowNode.id == node_id).first()
            if flow_node:
                flow_node.text = data["old_text"]
                
        elif operation == "reorder_nodes":
            # Undo reordering by restoring old orders
            old_orders = data["old_orders"]
            for node_id, old_order in old_orders.items():
                flow_node = db.query(FlowNode).filter(FlowNode.id == node_id).first()
                if flow_node:
                    flow_node.order = old_order
        
        db.commit()
        
        # Clear undo history after successful undo
        _clear_undo_history(project_id)
        
        # Return updated nodes
        updated_nodes = db.query(FlowNode).filter(
            FlowNode.project_id == project_id
        ).order_by(FlowNode.order).all()
        
        logger.info(f"Undid {operation} operation for project {project_id}")
        return updated_nodes
        
    except Exception as e:
        logger.error(f"Error undoing operation for project {project_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to undo operation"
        )


@router.put("/projects/{project_id}/flow")
async def save_edited_flow(
    project_id: int,
    flow_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Save edited flow data for a project.
    Replaces existing flow nodes with the edited version.
    
    Args:
        project_id: ID of the project
        flow_data: Edited flow data including actors, steps, flow_nodes, and edges
        db: Database session
        
    Returns:
        Success message with saved flow data
        
    Raises:
        HTTPException: If project not found or save fails
    """
    try:
        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {project_id} not found"
            )
        
        # Validate flow_data structure
        if "flow_nodes" not in flow_data or not isinstance(flow_data["flow_nodes"], list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid flow data: 'flow_nodes' is required and must be a list"
            )
        
        # Clear existing flow nodes for this project
        db.query(FlowNode).filter(FlowNode.project_id == project_id).delete()
        
        # Create new flow nodes from edited data
        created_nodes = []
        for node_data in flow_data["flow_nodes"]:
            flow_node = FlowNode(
                project_id=project_id,
                text=node_data.get("text", ""),
                order=node_data.get("order", 0),
                actor=node_data.get("actor"),
                step=node_data.get("step"),
                position_x=node_data.get("position_x"),
                position_y=node_data.get("position_y")
            )
            db.add(flow_node)
            created_nodes.append(flow_node)
        
        # Commit the transaction
        db.commit()
        
        # Refresh nodes to get IDs and timestamps
        for node in created_nodes:
            db.refresh(node)
        
        logger.info(f"Saved {len(created_nodes)} edited flow nodes for project {project_id}")
        
        # Return success with saved data
        return {
            "message": "Flow saved successfully",
            "project_id": project_id,
            "nodes_count": len(created_nodes),
            "flow": {
                "actors": flow_data.get("actors", []),
                "steps": flow_data.get("steps", []),
                "flow_nodes": [
                    {
                        "id": node.id,
                        "text": node.text,
                        "order": node.order,
                        "actor": node.actor,
                        "step": node.step
                    }
                    for node in created_nodes
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving edited flow for project {project_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save edited flow: {str(e)}"
        )