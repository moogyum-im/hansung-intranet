// src/components/StatusChanger.js
"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/EmployeeContext';
// ... 다른 import

export default function StatusChanger() {
    const { user: currentUser } = useAuth(); // useAuth()를 사용합니다.
    // ...
}