// src/components/ConstructionSiteModal.jsx
"use client";
import { useState, useEffect } from 'react';
import styles from './ConstructionSiteModal.module.css'; // CSS Modules 생성 필요!

export default function ConstructionSiteModal({ siteToEdit, onClose, onSave, isLoading }) {
    const initialFormState = {
        company_name: '',
        brand_name: '',
        complex_name: '',
        location: '',
        move_in_schedule: '',
        remarks: '',
    };
    const [formData, setFormData] = useState(initialFormState);
    const isEditMode = Boolean(siteToEdit);

    useEffect(() => {
        if (siteToEdit) {
            setFormData({
                company_name: siteToEdit.company_name || '',
                brand_name: siteToEdit.brand_name || '',
                complex_name: siteToEdit.complex_name || '',
                location: siteToEdit.location || '',
                move_in_schedule: siteToEdit.move_in_schedule || '',
                remarks: siteToEdit.remarks || '',
            });
        } else {
            setFormData(initialFormState);
        }
    }, [siteToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // 간단한 필수 입력 체크 (예시)
        if (!formData.complex_name) {
            alert('단지명은 필수 입력 항목입니다.');
            return;
        }
        onSave(formData, siteToEdit?.id); // 수정 모드일 경우 id도 함께 전달
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}> {/* 배경 클릭 시 닫기 */}
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}> {/* 모달 내부 클릭은 닫기 방지 */}
                <h2>{isEditMode ? '현황 수정' : '새 현황 추가'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* 각 필드 입력 UI - 반복되는 부분이므로 나중에 컴포넌트로 분리 가능 */}
                    <div className={styles.formGroup}>
                        <label htmlFor="complex_name">단지명 <span className={styles.required}>*</span></label>
                        <input type="text" id="complex_name" name="complex_name" value={formData.complex_name} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="company_name">업체명</label>
                        <input type="text" id="company_name" name="company_name" value={formData.company_name} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="brand_name">브랜드명</label>
                        <input type="text" id="brand_name" name="brand_name" value={formData.brand_name} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="location">지역</label>
                        <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="move_in_schedule">입주예정</label>
                        <input type="text" id="move_in_schedule" name="move_in_schedule" value={formData.move_in_schedule} onChange={handleChange} placeholder="YYYY.MM 또는 설명" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="remarks">비고</label>
                        <textarea id="remarks" name="remarks" value={formData.remarks} onChange={handleChange} rows="3"></textarea>
                    </div>
                    
                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} disabled={isLoading} className={styles.cancelButton}>취소</button>
                        <button type="submit" disabled={isLoading} className={styles.saveButton}>
                            {isLoading ? (
                                <span className={styles.buttonSpinner}></span>
                            ) : (
                                isEditMode ? '수정하기' : '추가하기'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}