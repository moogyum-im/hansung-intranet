'use client';

import { useState, useEffect } from 'react';

// value: 디바운싱할 값 (예: 검색어)
// delay: 지연 시간 (밀리초 단위, 예: 500ms)
export function useDebounce(value, delay) {
    // 디바운싱된 값을 저장할 state
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // value가 변경되면 delay 이후에 debouncedValue를 업데이트
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // cleanup 함수: 다음 effect가 실행되기 전 또는 컴포넌트가 unmount될 때
        // 이전의 timeout을 취소하여 불필요한 업데이트를 방지
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // value나 delay가 변경될 때만 effect를 다시 실행

    return debouncedValue;
}