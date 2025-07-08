// 파일 경로: src/components/DynamicFormFields.js

'use client';

import React from 'react';

// 데이터베이스의 fields(JSON) 배열을 받아 동적으로 폼을 생성하는 컴포넌트
export default function DynamicFormFields({ fields, formData, setFormData }) {
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // fields 배열이 없거나 비어있으면 아무것도 렌더링하지 않음
  if (!fields || fields.length === 0) {
    return <p className="text-gray-500">이 양식에 정의된 입력 필드가 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      {fields.map((field, index) => {
        // 각 필드의 고유한 name을 생성 (예: field_0, field_1)
        const fieldName = field.name || `field_${index}`;

        switch (field.type) {
          case 'text':
          case 'number':
          case 'date':
            return (
              <div key={index}>
                <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  name={fieldName}
                  id={fieldName}
                  value={formData[fieldName] || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder={field.placeholder || ''}
                  required={field.required || false}
                />
              </div>
            );
          case 'textarea':
            return (
              <div key={index}>
                <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <textarea
                  name={fieldName}
                  id={fieldName}
                  rows={5}
                  value={formData[fieldName] || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder={field.placeholder || ''}
                  required={field.required || false}
                />
              </div>
            );
          // 필요에 따라 'select', 'checkbox' 등 다른 타입 추가 가능
          default:
            return <div key={index} className="text-red-500">알 수 없는 필드 타입: {field.type}</div>;
        }
      })}
    </div>
  );
}