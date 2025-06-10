import axios from 'axios';

// 특정 사용자의 프로젝트 목록 가져오기
axios.get('http://localhost:5000/api/projects?userId=1')
  .then(response => {
    // 성공 시, response 객체에는 다양한 정보가 담겨 있습니다.
    // 가장 중요한 데이터는 response.data에 있습니다.
    console.log('상태 코드:', response.status); // 예: 200
    console.log('데이터:', response.data); // 서버가 보낸 JSON 데이터가 객체로 변환되어 있음
    console.log('헤더:', response.headers);
  })
  .catch(error => {
    // 요청이 실패했거나, 서버가 에러(4xx, 5xx)를 응답했을 때 실행됩니다.
    if (error.response) {
      // 서버가 응답을 했지만, 상태 코드가 2xx가 아닐 경우
      console.error('에러 데이터:', error.response.data); // 서버가 보낸 에러 메시지
      console.error('에러 상태 코드:', error.response.status);
    } else if (error.request) {
      // 요청이 전송되었지만, 응답을 받지 못했을 경우 (네트워크 문제 등)
      console.error('응답을 받지 못했습니다:', error.request);
    } else {
      // 요청을 설정하는 중에 에러가 발생했을 경우
      console.error('요청 설정 에러:', error.message);
    }
  });