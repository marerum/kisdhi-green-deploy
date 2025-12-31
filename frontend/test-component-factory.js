// Test script to verify ComponentFactory is working
const { ComponentFactory } = require('./src/utils/componentRegistry.ts');

console.log('Testing ComponentFactory...');

try {
  const testComponent = ComponentFactory.createByType('start', { x: 100, y: 100 }, { text: 'Test Start' });
  console.log('Created component:', testComponent);
  
  if (testComponent) {
    console.log('✅ ComponentFactory.createByType works correctly');
  } else {
    console.log('❌ ComponentFactory.createByType returned null');
  }
} catch (error) {
  console.error('❌ Error testing ComponentFactory:', error);
}