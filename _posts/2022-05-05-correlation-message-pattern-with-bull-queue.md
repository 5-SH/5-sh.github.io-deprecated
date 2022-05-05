---
layout: post
title: Bull 메시지 큐를 활용한 요청/응답 메시지 패턴 구현
date: 2022-05-05 08:30:00 + 0900
categories: Patterns
ref: Patterns, reactive programming, flow, flux
---

# Bull 메시지 큐를 활용한 요청/응답 메시지 패턴 구현
상관 식별자(Correlation Identifier) 개념과 Bull 메시지 큐를 활용해 단방향 채널 위에 요청/응답 패턴을 구현합니다.   

## 1. 들어가며
보통 메세징 시스템에서 생산자와 작업자 사이에 요청/응답 통신이 반드시 필요한 것은 아니며,   
단방향 비동기 통신 파이프 라인 구조를 통해 병렬 처리 및 확장을 수행합니다.    

그러나 쿼리 처리는 처리 후 결과를 응답 받아야 합니다.    
각 쿼리 요청을 태스크로 정의하고 ID 를 부여해 Bull 메시지 큐에 적재합니다.   
메시지 큐의 태스크는 순서대로 실행된 후 요청 전송자(클라이언트)가 ID 로 두 메시지를 상호 연결하고 응답을 적절한 핸들러에 반환해 처리합니다.    

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/166848517-0d575c29-d826-4d2b-bcaa-a0be8d2fc7e0.png" height="350" />
  <figcaption>▲ 상관 식별자를 사용한 요청/응답 메시지 교환</figcaption>
</figure>

## 2. Bull 큐
레디스를 활용한다.

## 3. 각 요소들
패턴을 구현하는데 사용된 각 요소들을 설명합니다.
### 3-1. Task
각 쿼리 요청을 메시지 큐에 넣기 위해 태스크로 추상화 한다.   
태스크는 클라이언트가 각 요청에 대한 응답을 식별을 위한 ID 로 id 를 사용한다.   
그리고 응답을 처리할 핸들러를 callback 에 저장한다.   
getParam() 함수는 태스크로 부터 메시지 큐에 넣을 메시지를 생성할 때 사용한다.   

```javascript
// Task.js

class Task {
  constructor(id, info) {
    this.id;
    this.callback;

    // 태스크를 수행하는데 필요한 정보들을 info 에서 받아온다.
    this.dbname = info.dbname;
    this.sql = info.sql;
    this.value = info.value;
    this.timeout = info.timeout;
    ...
  }

  getParam() {
    return {
      // 태스크를 수행하는데 필요한 정보들
      dbname = this.dbname;
      sql = this.sql;
      value = this.value;
      timeout = this.timeout;
      ...
    }
  }
}

module.exports = job;
```

### 3-2. Task Manager
태스크 매니저는 EventEmitter 를 상속 받는다.   
init 함수는 Bull 큐 인스턴스를 생성한다. 그리고 큐에 저장된 메시지(태스크) 를 처리할 방법을 this.queue.process(...) 에 정의한다.   

메시지 큐에서 메시지를 받아올 때 마다 this.queue.process 콜백 함수가 실행된다.   
이 때 인자로 전달된 태스크에는 숫자나 문자열 데이터만 저장되어 있다.   
task 에서 결과를 처리할 핸들러를 바로 받아 실행할 수 있지만,   
메시지에 숫자나 문자만 저장되는 Bull 큐 특성으로 인해 이벤트 전달 방식으로 this.emit(...) 를 사용해 결과를 전달한다.   

addTask 함수는 태스크에서 메시지를 만들어 메시지 큐에 저장한다.    
remvoeOnComplete 옵션으로 메시지 처리 완료 후 큐에서 메세지를 제거할 것인지 선택할 수 있고   
timeout 옵션으로 메시지의 타임아웃을 설정할 수 있다.   

this.queue.add(...) 로 메세지를 큐에 넣은 후 메시지 실행 결과를 전달받을 이벤트 핸들러를 등록한다.   
이벤트 핸들러는 한 번만 호출되면 되기 때문에 this.once(...) 로 등록한다.    
이 이벤트 핸들러에서 태스크 핸들러를 호출한다.   
요청과 응답 메세지를 연결하기 위해 태스크의 id 를 이벤트 명으로 설정한다.

```javascript
// JobManager.js

const EventEmitter = require('events');
const Queue = require('bull');
const { doQuery } = require('./query');

class TaskManager extends EventEmitter {
  constructor(queueName) {
    super();
    this.queue = null;
    this.queueName = queueName;
  }

  init() {
    if (!this.queue) {
      this.queue = new Queue(this.queueName, `redis://127.0.0.1:6479`, { prefix: `task_` });

      this.queue.process(async (task, done) => {
        const result = await doQuery(task.data);
        this.emit(task.data.id, result);
        done()
      });
    }
  }

  addTask(task) {
    const message = {
      id: task.id,
      ...task.getParam()
    }

    this.queue.add(message, {
      removeOnComplete: true,
      timeout: 5 * 1000
    }).then(() => {
      this.once(task.id, data => task.callback(data));
    });

    close() {
      return new Promise(async resolve => {
        if (this.queue) {
          this.queue.clean(10)
            .then(() => this.queue.close(true)
              .then(() => resolve(true)));
        }
      })
    }
  }
}

module.exports = TaskManager;
```

### 3-3. 클라이언트
태스크 매니저 인스턴스를 생성하고 메세지 큐에 사용자가 요청한 태스크를 추가한다.   
각 태스크는 고유한 ID 로 UUID 값을 가진다.

```javascript
// client.js
function genUUID() {
  const gen = () => ((1 + Math.random()) * 0x10000 | 0).toString(16).subString(1);
  return `${gen() + gen()}-${gen()}-${gen()}-${gen()}-${gen() + gen() + gen()}`;
}

const taskManager = new TaskManager('queryManager');
taskManager.init();

for (const d of list) {
  task.addTask(
    new Task(genUUID()), 
    {
      dbname: 'MySql',
      sql: 'INSERT INTO board VALUES(?,?,...)'
      value: `[[${d.line}, ${d.date}...], [${d.line}, ${d.date}...]...]`
      timeout: 5000
      ...
    });
}
```


## 4. 전체 구조

## 5. 동작 과정

## 6. 적용
Datasource 와 같은 라이프 사이클로 TaskManager 를 관리한다.