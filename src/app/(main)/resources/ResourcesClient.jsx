"use client"; // 이 코드는 브라우저에서 실행될 자바스크립트라는 뜻이에요.

import React from 'react';

// 'ResourcesClient' 라는 이름의 화면 컴포넌트를 만드는 거예요.
// 'resources' 라는 데이터 목록을 받아서 화면에 뿌려줄 거예요.
const ResourcesClient = ({ resources }) => {

  return (
    <div>
      <h1>자료실</h1>
      <div className="resource-list">
        {/* resources 배열에 있는 각 항목을 하나씩 꺼내서 보여주는 부분이에요. */}
        {resources.map((resource) => (
          <div key={resource.id} className="resource-item">
            <h2>{resource.title}</h2>
            <p>{resource.description}</p>
            
            {/* 여기가 가장 중요한 다운로드 버튼 부분이에요! */}
            {/* <a> 태그는 하이퍼링크를 만드는 HTML 태그예요. */}
            <a 
              // href: '어디로 연결할지' 알려주는 속성이에요.
              // `/${resource.path}`는 "public 폴더 안에 있는 이 경로의 파일로 연결해줘" 라는 뜻이에요.
              // 예를 들어 resource.path가 'resources/한성로고_심플.png' 라면,
              // public/resources/한성로고_심플.png 파일을 가리키게 돼요.
              href={`/${resource.path}`}
              
              // download: 이 속성이 있으면, 링크를 눌렀을 때 웹페이지로 이동하는 게 아니라
              // '파일을 다운로드'하게 해줘요. 값으로는 다운로드될 때의 파일 이름을 지정할 수 있어요.
              download={resource.file_name}
            >
              {/* a 태그 안에 버튼을 넣어서 사용자가 누를 수 있게 만들어요. */}
              <button>다운로드</button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

// 이 컴포넌트를 다른 파일에서도 쓸 수 있도록 내보내는 명령어예요.
export default ResourcesClient;