import { useEffect } from 'react';

export function usePrintImageFit() {
    useEffect(() => {
        const beforePrint = () => {
            document.querySelectorAll('.print-container img').forEach(img => {
                img.style.setProperty('max-height', '180mm', 'important');
                img.style.setProperty('width', 'auto', 'important');
                img.style.setProperty('max-width', '100%', 'important');
                img.style.setProperty('display', 'block', 'important');
                img.style.setProperty('page-break-inside', 'avoid', 'important');
            });
        };
        window.addEventListener('beforeprint', beforePrint);
        return () => window.removeEventListener('beforeprint', beforePrint);
    }, []);
}
