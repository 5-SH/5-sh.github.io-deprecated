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

## 2. Bull 메시지 큐
Bull 메시지 큐는 redis 기반의 큐 시스템을 구현한 노드 라이브러리 입니다.   
요청 피크를 완화할 때,   
마이크로서비스 간에 통신채널을 생성할 때,   
어플리케이션에서 무거운 작업을 많은 작업자에 나누어 오프로드 할 때 등    
다양한 문제를 분할 정복 접근 방식으로 해결할 때 사용됩니다.   

Bull 메시지 큐는 Job 이라 불리는 태스크 단위를 사용합니다.   
Job 은 메시지 큐에 추가되고 처리될 때 까지 아래 라이프 사이클을 가집니다.   
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/167081643-30fe8975-d5af-4877-8fa7-591a12c7bbe5.png" height="350" />
  <figcaption>▲ Job 라이프 사이클</figcaption>
</figure>

## 3. 각 요소들
패턴을 구현하는데 사용된 각 요소들을 설명합니다.
### 3-1. Job
각 쿼리 요청을 메시지 큐에 넣기 위해 Job 으로 추상화 합니다.   
Job 의 id 는 클라이언트가 각 요청에 대한 응답을 식별을 위한 구분자로 주로 UUID 를 사용합니다.   
그리고 응답을 처리할 핸들러를 callback 에 저장합니다.   
getParam() 함수는 Job 을 생성할 때 사용합니다.   

```javascript
// job.js

class Job {
  constructor(id, info) {
    this.id;
    this.callback;

    // Job 을 수행하는데 필요한 정보들을 클라이언트에게 받아옵니다.
    this.dbname = info.dbname;
    this.sql = info.sql;
    this.value = info.value;
    this.timeout = info.timeout;
    ...
  }

  getParam() {
    return {
      // Job 을 수행하는데 필요한 정보들
      dbname = this.dbname;
      sql = this.sql;
      value = this.value;
      timeout = this.timeout;
      ...
    }
  }
}

module.exports = Job;
```

### 3-2. JobManager
Job 매니저는 EventEmitter 를 상속 받습니다.   
init 함수는 Bull 메시지 큐 인스턴스를 생성합니다. 그리고 큐에 저장된 메시지(Job) 를 처리할 방법을 this.queue.process(...) 에 정의합니다.   

메시지 큐에서 메시지를 받아올 때 마다 this.queue.process 콜백 함수가 실행됩니다.   
이 때 인자로 전달된 Job 에는 숫자나 문자열 데이터만 저장되어 있습니다.   
job 인스턴스에서 결과를 처리할 핸들러를 바로 받아 실행할 수 있지만,   
메시지에 숫자나 문자만 저장되는 Bull 메시지 큐 특성으로 인해 이벤트 전달 방식으로 this.emit(...) 를 사용해 결과를 전달합니다.   

addJob 함수는 Job 을 메시지 큐에 저장합니다.    
remvoeOnComplete 옵션으로 메시지 처리 완료 후 큐에서 Job 을 제거할 것인지 선택할 수 있고   
timeout 옵션으로 메시지의 타임아웃을 설정할 수 있습니다.   

this.queue.add(...) 로 메세지를 큐에 넣은 후 메시지 실행 결과를 전달받을 이벤트 핸들러를 등록합니다.   
이벤트 핸들러는 한 번만 호출되면 되기 때문에 this.once(...) 로 등록합니다.    
이 이벤트 핸들러에서 태스크 핸들러를 호출합니다.   
요청과 응답 메세지를 연결하기 위해 Job 의 id 를 이벤트 명으로 설정합니다.

```javascript
// JobManager.js

const EventEmitter = require('events');
const Queue = require('bull');
const { doQuery } = require('./query');

class JobManager extends EventEmitter {
  constructor(queueName) {
    super();
    this.queue = null;
    this.queueName = queueName;
  }

  init() {
    if (!this.queue) {
      this.queue = new Queue(this.queueName, `redis://127.0.0.1:6479`, { prefix: `job_` });

      this.queue.process(async (job, done) => {
        const result = await doQuery(job.data);
        this.emit(job.data.id, result);
        done()
      });
    }
  }

  addJob(job) {
    const message = {
      id: job.id,
      ...job.getParam()
    }

    this.queue.add(message, {
      removeOnComplete: true,
      timeout: 5 * 1000
    }).then(() => {
      this.once(job.id, data => job.callback(data));
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

module.exports = JobManager;
```

### 3-3. 클라이언트
Job 매니저 인스턴스를 생성하고 메세지 큐에 사용자가 요청한 Job 을 추가합니다.   
각 Job 은 고유한 ID 로 UUID 값을 가집니다.

```javascript
// client.js
function genUUID() {
  const gen = () => ((1 + Math.random()) * 0x10000 | 0).toString(16).subString(1);
  return `${gen() + gen()}-${gen()}-${gen()}-${gen()}-${gen() + gen() + gen()}`;
}

const JobManager = new JobManager('queryManager');
JobManager.init();

for (const d of list) {
  jobManager.addJob(
    new job(genUUID()), 
    {
      dbname: 'MySql',
      sql: 'INSERT INTO board VALUES(?,?,...)'
      value: `[[${d.line}, ${d.date}...], [${d.line}, ${d.date}...]...]`
      timeout: 5000
      ...
    });
}
```

## 4. 동작 과정
```javascript
// client.js
...
for (const d of list) {
  jobManager.addJob(                               // (1)
    new job(genUUID()), 
    {
      dbname: 'MySql',
      sql: 'INSERT INTO board VALUES(?,?,...)'
      value: `[[${d.line}, ${d.date}...], [${d.line}, ${d.date}...]...]`
      timeout: 5000
      ...
    });
}
```

```javascript
// JobManager.js

const EventEmitter = require('events');
const Queue = require('bull');
const { doQuery } = require('./query');

class JobManager extends EventEmitter {
  constructor(queueName) {
    super();
    this.queue = null;
    this.queueName = queueName;
  }

  init() {
    if (!this.queue) {
      this.queue = new Queue(this.queueName, `redis://127.0.0.1:6479`, { prefix: `job_` });

      this.queue.process(async (job, done) => {            // (4)
        const result = await doQuery(job.data);
        this.emit(job.data.id, result);                    // (5)
        done()
      });
    }
  }

  addJob(job) {
    const message = {
      id: job.id,
      ...job.getParam()
    }

    this.queue.add(message, {                                 // (2)
      removeOnComplete: true,
      timeout: 5 * 1000
    }).then(() => {
      this.once(job.id, data => job.callback(data));        // (3)
    });

    ...
  }
}
```

(1) client.js 에서 Job 을 추가합니다.   
(2) Job 을 큐에 추가합니다.   
(3) 큐에 추가한 후 Job ID 를 이벤트 명으로 하는 이벤트 핸들러를 등록합니다. 이벤트 핸들러는 Job 실행 결과를 처리할 핸들러를 호출합니다.   
(4) Job 이 자신의 순서가 되었을 때 처리됩니다.   
(5) Job 이 처리된 결과를 Job ID 이벤트로 전달합니다. 이 때 (3) 에 등록한 이벤트 핸들러가 호출되고 Job 실행 결과를 핸들러로 처리합니다.
