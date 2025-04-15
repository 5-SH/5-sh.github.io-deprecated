---
layout: post
title: pm2 를 사용해 무중단 배포하기
date: 2021-10-19 10:30:00 + 0900
categories: Nodejs
ref: deployment, pm2
---

출처 : https://engineering.linecorp.com/ko/blog/pm2-nodejs/   

# pm2 를 사용해 무중단 배포하기

- node.js 는 기본적으로 싱글 스레드라서 CPU 의 멀티코어 시스템을 활용할 수 없다.
- node.js 의 cluster 모듈을 통해 멀티 프로세스로 늘려 멀티코어 시스템 문제를 해결한다.
- 클러스터 모듈을 사용해 마스터 프로세스에서 CPU 코어 수만큼 워커 프로세스를 생성해 모든 코어를 사용하도록 개발한다.
- 부모(마스터) 프로세스가 자식(워커) 프로세스를 생성하고 나서 자식 프로세스가 오류로 종료되거나, 재시작을 위해 자식 프로세스를 종료해야 할 때 등 고려해야 할 것이 많다.
- 이런 문제들을 pm2 를 활용해 쉽게 해결할 수 있다.



## 1. pm2 사용법

아래와 같은 간단한 node.js 애플리케이션이 있다.

```javascript
//app.js
const express = require('express')
const app = express()
const port = 3000
app.get('/', function (req, res) { 
  res.send('Hello World!')
})
app.listen(port, function () {
  console.log(`application is listening on port ${port}...`)
})
```

이 애플리케이션을 아래 설정으로 pm2 를 통해 실행한다.

```javascript
//ecosystem.config.js
module.exports = {
  apps: [{
  name: 'app',
  script: './app.js',
  instances: 0,         // 0 인 경우 CPU 코어 수 만큼 프로세스 생성
  exec_mode: ‘cluster’  // cluster 모드로 실행, default 값은 fork 모드
  }]
}
```

### 1-1. pm2 cluster 와 fork 모드의 차이
node.js 애플리케이션을 실행한다고 가정할 때, pm2 에서 fork 모드는 child_process.fork 모듈을 사용하고 cluster 모드는 cluster 모듈을 사용한다.   

#### 1-1-1. fork mode
- pm2 로 php 또는 파이썬 서버 등을 실행할 수 있다.
- 여러 인스턴스를 생성한 다음 HAProxy 또는 Nginx 등으로 로드밸런싱 해야한다.

#### 1-1-2. cluster mode
- node.js 클러스터 모듈에 접근하기 대문에 node.js 애플리케이션에서만 사용할 수 있다.
- 생성된 인스턴스들에 클러스터 모듈이 자동으로 로드밸런싱을 하도록 처리한다.

<br />

실행 결과는 아래와 같이 4개의 프로세스가 실행된다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/137768696-4ef8e80b-bbcb-42ce-8f49-871d6f23ad7f.png" />
  <p style="font-style: italic; color: gray;">출처 - https://engineering.linecorp.com/ko/blog/pm2-nodejs/</p>
</figure>

### 1-2. pm2 scale
pm2 scale 명령어를 통해 실시간으로 프로세스 스케일을 조절할 수 있다.

```javascript
// 프로세스 늘리기
$ pm2 scale app +4
[PM2] Scaling up application
[PM2] Scaling up application
[PM2] Scaling up application
[PM2] Scaling up application

// 프로세스 줄이기
$ pm2 scale app 4
[PM2] Applying action deleteProcessId on app [0](ids: 0)
[PM2] [app](0) ✓
[PM2] Applying action deleteProcessId on app [1](ids: 1)
[PM2] [app](1) ✓
[PM2] Applying action deleteProcessId on app [2](ids: 2)
[PM2] [app](2) ✓
[PM2] Applying action deleteProcessId on app [3](ids: 3)
[PM2] [app](3) ✓
```

### 1-3. 프로세스 재시작

pm2 reload 명령어로 실행 중인 프로세스를 재시작 할 수 있다.

```javascript
// 프로세스 재시작
$ pm2 reload app
[PM2] Applying action reloadProcessId on app [app](ids: 4,5,6,7)
[PM2] [app](5) ✓
[PM2] [app](4) ✓
[PM2] [app](6) ✓
[PM2] [app](7) ✓
```



## 2. pm2 reload 재시작 과정

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/137770333-1c3c8ec9-0307-4868-b9ca-d84828893575.png" />
  <p style="font-style: italic; color: gray;">출처 - https://engineering.linecorp.com/ko/blog/pm2-nodejs/</p>
</figure>

- pm2 reload 를 실행하면 기존 App 을 Old App 에 옮기고 새로운 App 을 만든다.
- 새로운 App 은 요청을 처리할 준비가 되면 부모 프로세스에게 'ready' 이벤트를 보낸다.
- 부모 프로세스는 Old App 에 SIGINT 시그널을 보내고 종료되길 기다린다.
- 일정시간(1600ms) 이후 Old App 이 종료되지 않으면 SIGKILL 시그널을 보내 강제로 종료한다.



## 3. 재시작 과정에서 서비스 중단이 발생하는 경우

### 3-1. 새로 만들어진 프로세스가 아직 요청을 받을 준비가 안되었는데 ready 이벤트를 보내는 경우

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/137771954-78aeaf74-9228-4285-ab6f-ca5dbbf2f04f.png" />
  <p style="font-style: italic; color: gray;">출처 - https://engineering.linecorp.com/ko/blog/pm2-nodejs/</p>
</figure>

- 위와 같이 새로 만들어진 App 의 구동이 완료되기 전에 ready 이벤트를 보내고 이전 프로세스가 종료되어 사용자의 요청을 처리할 수 없는 상황이 발생할 수 있다.

- 이 문제를 해결하기 위해 새로 만들어진 App 의 구동이 완료되면 ready 이벤트를 보내도록 처리해야 한다. 
- 그리고 부모 프로세스가 ready 이벤트를 언제까지 기다릴 것인지 함께 정해야 한다.

```javascript
//app.js
const express = require('express')
const app = express()
const port = 3000
app.get('/', function (req, res) { 
  res.send('Hello World!')
})
app.listen(port, function () {
  process.send(‘ready’)			// app.listen 이 완료되면 부모 프로세스에 ready 이벤트를 보내도록 수정
  console.log(`application is listening on port ${port}...`)
})
```

```javascript
// ready 이벤트 설정 변경
// ecosystem.config.js
module.exports = {
  apps: [{
  name: 'app',
  script: './app.js',
  instances: 0,
  exec_mode: ‘cluster’,		
  wait_ready: true,			// 부모 프로세스에게 ready 이벤트를 기다리라는 의미
  listen_timeout: 50000		// ready 이벤트를 기다릴 시간
  }]
}
```

ready 이벤트 설정 변경 후 아래 그림과 같다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/137773276-7f951585-da2e-4099-b65c-b8823dc9e9e4.png" />
  <p style="font-style: italic; color: gray;">출처 - https://engineering.linecorp.com/ko/blog/pm2-nodejs/</p>
</figure>

### 3-2. 클라이언트 요청을 처리하는 도중에 프로세스가 죽어버리는 경우

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/137774178-da169301-6f93-4668-8825-a45f348612aa.png" />
  <p style="font-style: italic; color: gray;">출처 - https://engineering.linecorp.com/ko/blog/pm2-nodejs/</p>
</figure>

- reload 명령어를 실행할 때, 기존 App 은 프로세스가 종료되기 전까지 계속해서 요청을 받는다.

- SIGINT 시그널이 기존 App 에 전달된 상태에서 요청을 받았고, 요청을 처리하는데 5,000ms 가 걸린다면,

  1,600ms 뒤 기존 App 이 종료되어 클라이언트 요청을 응답하지 못한 채 서비스가 종료된다.

- 이 문제를 해결하기 위해 App 에서 SIGINT 시그널을 리스닝하다가 전달되면 app.close 명령어로

  프로세스가 새로운 요청을 받지 않고 기존 연결은 유지하도록 처리해야 한다.

- 그리고 사용자 요청을 처리하기에 충분한 시간을 kill_timeout 으로 설정한다.

```javascript
// 클라이언트 요청 처리 설정
// ecosystem.config.js
module.exports = {
  apps: [{
  name: 'app',
  script: './app.js',
  instances: 0,
  exec_mode: ‘cluster’,
  wait_ready: true,
  listen_timeout: 50000,
  kill_timeout: 5000		// SIGINT 시그널을 보낸 후 프로세스가 종료되지 않을때 SIGKILL ㅇ시그널을 보내기까지 대기 시간을 설정
  }]
}
```

```javascript
//app.js
const express = require('express')
const app = express()
const port = 3000
app.get('/', function (req, res) { 
  res.send('Hello World!')
})
app.listen(port, function () {
  process.send(‘ready’)
  console.log(`application is listening on port ${port}...`)
})
// SIGINT 시그널을 받으면 app.close 로 새로운 요청을 거절하고 이미 연결된 것은 유지한다.
process.on(‘SIGINT’, function () {
  app.close(function () {
  console.log(‘server closed’)
  process.exit(0)
  })
})
```

하지만  HTTP 1.1 Keep Alive 를 사용해 요청이 처리된 후에도 기존 연결이 계속 유지된다면 문제가 해결되지 않는다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/137774946-4df4e0d2-a78f-4152-90b3-2573b05366df.png" />
  <p style="font-style: italic; color: gray;">출처 - https://engineering.linecorp.com/ko/blog/pm2-nodejs/</p>
</figure>

SIGINT 시그널을 받았을 때 Connection:close 를 설정해 클라이언트 요청을 종료하는 방법을 활용해 해결한다.

```javascript
// 특정 전역 플래그값에 따른 응답 헤더 설정
// app.js
const express = require('express')
const app = express()
const port = 3000
let isDisableKeepAlive = false
app.use(function(req, res, next) {
  if (isDisableKeepAlive) {
    res.set(‘Connection’, ‘close’)
  }
  next()
})
app.get('/', function(req, res) { 
  res.send('Hello World!')
})
app.listen(port, function() {
  process.send(‘ready’)
  console.log(`application is listening on port ${port}...`)
})
process.on(‘SIGINT’, function () {
  isDisableKeepAlive = true
  app.close(function () {
  console.log(‘server closed’)
  process.exit(0)
  })
})
```





