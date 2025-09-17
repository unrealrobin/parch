import React from 'react';
import './ColorPicker.css';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  label, 
  value, 
  onChange, 
  description 
}) => {
  return (
    <div className="color-picker-container">
      <div className="color-picker-header">
        <label className="color-picker-label">{label}</label>
        {description && <p className="color-picker-description">{description}</p>}
      </div>
      <div className="color-picker-control">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-picker-input"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-picker-text"
          placeholder="#000000"
        />
      </div>
    </div>
  );
};

export default ColorPicker;
