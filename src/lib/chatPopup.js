// src/lib/chatPopup.js
const popupWindows = {};

// 특정 채팅방 팝업 (알림 클릭 시)
export function openChatPopup(roomId) {
    if (typeof window === 'undefined') return;
    const main = popupWindows['__main__'];
    if (main && !main.closed) {
        main.focus();
        // BroadcastChannel로 팝업에 방 이동 요청
        const bc = new BroadcastChannel('hansung_chat');
        bc.postMessage({ type: 'NAVIGATE_TO_ROOM', roomId });
        bc.close();
        return main;
    }
    return openMainChatPopup(roomId);
}

// 메인 채팅 팝업 (사이드바 클릭 시)
export function openMainChatPopup(initialRoomId = null) {
    if (typeof window === 'undefined') return;
    const existing = popupWindows['__main__'];
    if (existing && !existing.closed) {
        existing.focus();
        if (initialRoomId) {
            const bc = new BroadcastChannel('hansung_chat');
            bc.postMessage({ type: 'NAVIGATE_TO_ROOM', roomId: initialRoomId });
            bc.close();
        }
        return existing;
    }
    const width  = 780;
    const height = 700;
    const left   = Math.max(0, window.screenX + Math.round((window.outerWidth  - width)  / 2));
    const top    = Math.max(0, window.screenY + Math.round((window.outerHeight - height) / 2));
    const popup  = window.open(
        initialRoomId ? `/chat-popup/${initialRoomId}` : '/chat-popup',
        'hansung_chat_main',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    );
    if (popup) popupWindows['__main__'] = popup;
    return popup;
}

export function isPopupOpen(roomId) {
    if (typeof window === 'undefined') return false;
    const popup = popupWindows[roomId] ?? popupWindows['__main__'];
    return !!(popup && !popup.closed);
}