---
layout: post
title: WebSocket 과 Socket.io
date: 2021-07-12 23:00:00 + 0900
categories: Network
ref: WebSocket, Socket.io
---

# WebSocket 과 Socket.io

## 1. WebSocket 이 있기 까지
웹 역사가 시작되었을 때에는 사용자와의 상호작용은 웹 개발에 큰 부분을 차지 하지 않았다.   
전형적인 브라우저 렌더링 방식은 HTTP 요청에 대한 HTTP 응답을 받아서 브라우저의 화면을 깨끗하게 지우고 받은 내용을 새로 표시하는 방식이다. 내용을 지우고 다시 그리면 브라우저의 깜빡임이 생기게 된다.   
<br/>
상호작용하는 웹 서비스를 위해 숨겨진 프레임을 이용한 방법이나 Long Polling, Stream 등 다양한 방법을 사용했다. 이 방식들은 브라우저가 HTTP 요청을 보내고 웹서버가 이 요청에 대한 HTTP 응답을 보내는 단방향 메세지 교환 규칙을 변경하지 않고 구현한 방식이다.    
<br/>
브라우저와 웹서버 사이에 더 자유로운 양방향 메세지 송수신이 필요하다. 그래서 HTML5 표준안 일부로 WebSocket 이 등장했다. 소켓을 이용해 기존의 요청-응답 관계 방식보다 더 쉽게 데이터를 교환할 수 있다.   

![FT_2021-07-12 23_43_41 206](https://user-images.githubusercontent.com/13375810/125307566-206dba80-e36b-11eb-8567-180004159aff.png)
<br/>

## 2. WebSocket 프로토콜
WebSocket 은 다른 HTTP 요청과 같이 80 번 포트를 통해 웹서버에 연결한다. Upgrade 헤더를 사용해 웹서버에 요청한다.    
> GET /... HTTP/1.1   
> Upgrade: WebSocket   
> Connection: Upgrade   

브라우저는 Updgrade:WebSocket 헤더 등과 함께 랜덤하게 생성한 키를 서버에 보낸다.   
웹서버는 이 키를 바탕으로 토큰을 생성해 브라우저에 돌려준다. 이 과정으로 WebSocket 핸드쉐이킹이 이루어진다.   
<br/>
그리고 Protocol Overhead 방식으로 웹서버와 브라우저가 데이터를 주고 받는다.   
Protocol Overhead 방식은 여러 TCP 커넥션을 생성하지 않고 하나의 80 번 포트 TCP 커넥션을 이용하고   
별도의 헤더 등으로 논리적인 데이터 흐름 단위를 이용해 여러 개의 커넥션을 맺는 효과를 내는 방식이다.   

## 3. WebSocket API 사용
```javascript
if ('WebSocket' in window) {
  const oSocket = new WebSocket("ws://localhost:80");
  
  oSocket.onMessage = function (e) {
    console.log(e.data);
  }

  oSocket.onOpen = function (e) {
    if (e) console.error(e);
    console.log("open");
  }

  oSocket.onClose = function (e) {
    if (e) console.error(e);
    console.log("close");
  }

  oSocket.send("message");
  oSocket.close();
}
```

WebSocket 프로토콜을 나타내는 ws:// 는 URI 스키마를 사용한다. 암호화 소켓은 wss:// 를 사용한다.   

## 4. Socket.io 는 무엇인가?
WebSocket 이 아직 표준이 되기 전 javascript 를 사용해 브라우저 종류에 상관없이 실시간 웹을 구현할 수 있도록 한 기술이다.   
Socket.io 는 WebSocket, FlashSocket, AJAX Long Polling, AJAX Multi part Streaming, IFram e, JSONP Polling 을 하나의 API 로 추상화 한 것이다.   
브라우저와 웹서버의 종류, 버전을 파악해 가장 적합한 기술을 선택해 사용하는 방식이다.   
Socket.io 는 표준 기술이 아니고 MIT 라이센서를 가진 오픈소스 Node.js 모듈이다.   
## 5. Socket.io 사용
```javascript
// server script
const io = require('socket.io').listen(80);
io.sockets.on('connection', socket => {
  socket.emit('news', { hello: 'world' });

  socket.on('my other event', data => {
    console.log(data);
  });
});
```

```javascript
// client script
<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io.connect('http://localhost');
socket.on('news', data => {
  console.log(data);
  socket.emit('my other event', { my: 'data' });
});
</script>
```
브라우저에서 클라이언트 페이지를 열면 클라이언트 콘솔에는 { hello: 'world' } 가   
서버 콘솔에는 { my: 'data' } 가 출력된다.   
Node.js 를 사용하는 웹서버와 연결해 서버에게 session id 정보와 timeout 정보를 받고   
브라우저의 WebSocket 지원 여부, FlashSocket 지원 여부를 보내고 크로스 도메인 설정 정보 등을 주고받은 후 실시간 웹 방식을 선택한다.   
