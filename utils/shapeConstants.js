/**
 * Shape definitions and metadata for the drawing tools
 */

export const SHAPES = [
  { id: 'rectangle', label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { id: 'circle', label: 'Circle', icon: '●', shortcut: 'C' },
  { id: 'triangle', label: 'Triangle', icon: '▲', shortcut: 'T' },
  { id: 'line', label: 'Line', icon: '―', shortcut: 'L' },
  { id: 'arrow', label: 'Arrow', icon: '→', shortcut: 'A' },
  { id: 'star', label: 'Star', icon: '★', shortcut: 'S' },
  { id: 'heart', label: 'Heart', icon: '♥', shortcut: 'H' },
  { id: 'diamond', label: 'Diamond', icon: '◆', shortcut: 'D' },
  { id: 'speech-bubble', label: 'Speech Bubble', icon: '💬', shortcut: 'Q' },
  { id: 'thought-bubble', label: 'Thought Bubble', icon: '◉', shortcut: 'B' },
];

export const getShapeLabel = (shapeId) => {
  return SHAPES.find(s => s.id === shapeId)?.label || shapeId;
};

export const getShapeIcon = (shapeId) => {
  return SHAPES.find(s => s.id === shapeId)?.icon || '?';
};
