/**
 * Test script to verify Actor/Step component creation
 */

const { ComponentFactory } = require('./src/utils/componentRegistry');
const { COMPONENT_TEMPLATES } = require('./src/components/flow/ComponentLibrary');

console.log('=== Testing Actor/Step Component Creation ===');

// Test finding templates
const actorTemplate = COMPONENT_TEMPLATES.find(t => t.type === 'actor');
const stepTemplate = COMPONENT_TEMPLATES.find(t => t.type === 'step');

console.log('Actor template found:', !!actorTemplate);
console.log('Step template found:', !!stepTemplate);

if (actorTemplate) {
  console.log('Actor template:', {
    type: actorTemplate.type,
    name: actorTemplate.name,
    category: actorTemplate.category,
    defaultSize: actorTemplate.defaultSize,
    defaultStyle: actorTemplate.defaultStyle
  });
}

if (stepTemplate) {
  console.log('Step template:', {
    type: stepTemplate.type,
    name: stepTemplate.name,
    category: stepTemplate.category,
    defaultSize: stepTemplate.defaultSize,
    defaultStyle: stepTemplate.defaultStyle
  });
}

// Test creating components
try {
  const actorComponent = ComponentFactory.createByType('actor', { x: 100, y: 100 }, { text: 'Test Actor' });
  console.log('Actor component created:', !!actorComponent);
  if (actorComponent) {
    console.log('Actor component details:', {
      id: actorComponent.id,
      type: actorComponent.type,
      text: actorComponent.text,
      size: actorComponent.size,
      style: actorComponent.style
    });
  }
} catch (error) {
  console.error('Error creating actor component:', error);
}

try {
  const stepComponent = ComponentFactory.createByType('step', { x: 200, y: 100 }, { text: 'Test Step' });
  console.log('Step component created:', !!stepComponent);
  if (stepComponent) {
    console.log('Step component details:', {
      id: stepComponent.id,
      type: stepComponent.type,
      text: stepComponent.text,
      size: stepComponent.size,
      style: stepComponent.style
    });
  }
} catch (error) {
  console.error('Error creating step component:', error);
}