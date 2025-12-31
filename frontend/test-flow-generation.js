// Test script to simulate flow generation
const fetch = require('node-fetch');

async function testFlowGeneration() {
  try {
    console.log('Testing flow generation...');
    
    const response = await fetch('http://localhost:8000/api/projects/6/flow/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Flow generation response:', JSON.stringify(data, null, 2));
    
    // Test the conversion logic
    const nodes = data.flow_nodes;
    console.log('\nTesting conversion logic...');
    console.log('Nodes to convert:', nodes);
    
    if (nodes && nodes.length > 0) {
      console.log('✅ Flow generation successful');
      console.log(`Generated ${nodes.length} nodes`);
      
      // Simulate the conversion
      nodes.forEach((node, index) => {
        const componentType = index === 0 ? 'start' : 
                             index === nodes.length - 1 ? 'end' : 'process';
        console.log(`Node ${index}: ${node.text} -> ${componentType}`);
      });
    } else {
      console.log('❌ No nodes generated');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFlowGeneration();