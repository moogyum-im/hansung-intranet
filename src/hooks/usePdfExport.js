import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const usePdfExport = (printRef) => {
    const [isExporting, setIsExporting] = useState(false);

    const exportToPdf = async (fileName = 'document.pdf') => {
        if (!printRef.current) {
            console.error("PDF로 변환할 콘텐츠를 찾을 수 없습니다.");
            return;
        }

        setIsExporting(true);

        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2, // 해상도를 2배로 높여 더 선명한 이미지를 얻습니다.
                useCORS: true, // 외부 이미지가 있다면 필요합니다.
            });

            const imageData = canvas.toDataURL('image/png');

            // A4 사이즈: 210mm x 297mm
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // 이미지의 가로/세로 비율을 유지하면서 A4 페이지에 맞게 크기 조정
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasAspectRatio = canvasWidth / canvasHeight;
            const pageAspectRatio = pageWidth / pageHeight;

            let imgWidth = pageWidth;
            let imgHeight = pageWidth / canvasAspectRatio;

            // 만약 이미지 높이가 페이지 높이보다 크면, 높이를 기준으로 너비 조정
            if (imgHeight > pageHeight) {
                imgHeight = pageHeight;
                imgWidth = pageHeight * canvasAspectRatio;
            }
            
            const positionX = (pageWidth - imgWidth) / 2; // 페이지 중앙에 위치
            const positionY = 0;

            pdf.addImage(imageData, 'PNG', positionX, positionY, imgWidth, imgHeight);
            pdf.save(fileName);

        } catch (error) {
            console.error("PDF 생성 중 오류 발생:", error);
        } finally {
            setIsExporting(false);
        }
    };

    return { exportToPdf, isExporting };
};