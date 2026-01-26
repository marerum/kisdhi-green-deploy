"""
Data sanitization utilities for ensuring HTTPS compliance.
"""
import re
from typing import List, Dict, Any, Optional


def sanitize_http_to_https(text: Optional[str]) -> Optional[str]:
    """
    Convert HTTP URLs to HTTPS in text content.
    
    Args:
        text: Text content that may contain HTTP URLs
        
    Returns:
        Text with HTTP URLs converted to HTTPS, or None if input is None
    """
    if text is None:
        return None
    
    # Replace http:// with https:// for URLs
    # Matches http:// followed by domain/path characters
    return re.sub(
        r'http://([\w\-\.]+(?:/[\w\-\./?%&=]*)?)',
        r'https://\1',
        text,
        flags=re.IGNORECASE
    )


def sanitize_flow_nodes(flow_nodes: List[Any]) -> List[Any]:
    """
    Sanitize flow node text fields to ensure HTTPS compliance.
    
    Args:
        flow_nodes: List of FlowNode objects
        
    Returns:
        Same list with sanitized text fields
    """
    for node in flow_nodes:
        if hasattr(node, 'text') and node.text:
            node.text = sanitize_http_to_https(node.text)
        if hasattr(node, 'actor') and node.actor:
            node.actor = sanitize_http_to_https(node.actor)
        if hasattr(node, 'step') and node.step:
            node.step = sanitize_http_to_https(node.step)
    
    return flow_nodes


def sanitize_flow_edges(flow_edges: List[Any]) -> List[Any]:
    """
    Sanitize flow edge condition fields to ensure HTTPS compliance.
    
    Args:
        flow_edges: List of FlowEdge objects
        
    Returns:
        Same list with sanitized condition fields
    """
    for edge in flow_edges:
        if hasattr(edge, 'condition') and edge.condition:
            edge.condition = sanitize_http_to_https(edge.condition)
    
    return flow_edges
