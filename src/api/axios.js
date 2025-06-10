import axios from 'axios';

// axios 인스턴스를 생성합니다.
const instance = axios.create({
    // 백엔드 서버의 기본 URL을 설정합니다.
    // 이렇게 해두면 다른 파일에서 API를 호출할 때 전체 주소를 다 쓰지 않아도 됩니다.
    // 예: instance.get('/api/projects') -> 실제로는 'http://localhost:5000/api/projects'로 요청됩니다.
    baseURL: 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json',
    }
});

// 생성한 axios 인스턴스를 이 파일의 기본 내보내기(default export)로 지정합니다.
// 이렇게 해야 다른 파일에서 'import axios from ...' 구문으로 불러올 수 있습니다.
export default instance;