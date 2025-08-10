// 파일 경로: src/components/ApprovalFormLayout.jsx
'use client';

import React from 'react';
import Link from 'next/link';

export default function ApprovalFormLayout({ title, description, children }) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">{title}</h1>
      <p className="text-gray-600 mb-8">{description}</p>
      
      <div className="bg-white rounded-xl shadow-lg p-8">
        {children}
      </div>
    </div>
  );
}