---
layout: post
title: Node.js child process vs worker threads vs cluster
date: 2021-10-19 11:30:00 + 0900
categories: [nodejs]
tags: [deployment, pm2]
---





출처 : https://alvinlal.netlify.app/blog/single-thread-vs-child-process-vs-worker-threads-vs-cluster-in-nodejs

# Node.js child process vs worker threads vs cluster

- Node.js 는 Http 요청에 응답하고, DB 에 데이터를 저장, 요청하고 다른 서버와 통신하는 IO 바운드 작업에 탁월하다.
- 그러나 CPU intensive 한 작업을 하면 이벤트 루프가 블로킹되어 성능이 많이 떨어진다.

아래와 같이 피보나치 값을 구하는 간단한 Node.js 서버를 만들고 localhost:3000/getfibonacci?number=600000 로 요청하면 

CPU intensive 한 작업을 처리하느라 서버가 새로운 요청을 응답하지 않는다. 

그리고 Node.js 는 싱글스레드로 동작하기 때문에 CPU 한 코어만 바쁘게 돌아간다.

```javascript
// server.js
const express = require("express")
Copy
const app = express()
app.get("/getfibonacci", (req, res) => {
  const startTime = new Date()
  const result = fibonacci(parseInt(req.query.number)) //parseInt is for converting string to number
  const endTime = new Date()
  res.json({
    number: parseInt(req.query.number),
    fibonacci: result,
    time: endTime.getTime() - startTime.getTime() + "ms",
  })
})
const fibonacci = n => {
  if (n <= 1) {
    return 1
  }
  return fibonacci(n - 1) + fibonacci(n - 2)
}
```

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/137780289-6b9098c9-3397-4ebe-95a8-b43854d641de.jpg" />
  <p style="font-style: italic; color: gray;">출처 - https://alvinlal.netlify.app/blog/single-thread-vs-child-process-vs-worker-threads-vs-cluster-in-nodejs</p>
</figure>



## 1. child process 를 통한 해결

child_process 모듈은 새로운 프로세스를 만들도록 한다. 생성된 프로세스간의 통신은 IPC 를 사용한다.   

### 1-1.  child_process.spawn()

- 자식 프로세스를 비동기 적으로 만든다.
- 터미널에서 실행 가능한 커맨드를 실행할 수 있다.
- spawn 으로 생성된 자식 프로세스도 stdin, stdout, stderr 파이프를 가진다.
- Node.js 의 자식 프로세스는 기본적으로 spawn 으로 이루어지고 exec, fork 등은 spawn 을 사용해 만든 편의 기능들 이다.

```javascript
// child_spawn_server.js
const express = require("express")
const app = express()
const { spawn } = require("child_process") //equal to const spawn = require('child_process').spawn

app.get("/ls", (req, res) => {
  const ls = spawn("ls", ["-lash", req.query.directory])
  ls.stdout.on("data", data => {
    //Pipe (connection) between stdin,stdout,stderr are established between the parent
    //node.js process and spawned subprocess and we can listen the data event on the stdout
    res.write(data.toString()) //date would be coming as streams(chunks of data)
    // since res is a writable stream,we are writing to it
  })
  ls.on("close", code => {
    console.log(`child process exited with code ${code}`)
    res.end() //finally all the written streams are send back when the subprocess exit
  })
})
app.listen(7000, () => console.log("listening on port 7000"))
```

### 1-2. child_process.fork()

- Node.js 프로세스를 실행하기 위해 특별히 사용된다.
- 부모 프로세스와 IPC 채널이 default 로 생성된다.
- fork 를 활용하면 위와 같이 CPU intensive 한 작업으로 서버가 블로킹 되는 것을 막을 수 있다.
- 그러나 프로세스를 새로 생성하기 때문에 스레드를 활용하는 방법에 비해 시간과 리소스 오버헤드가 크다.

```javascript
// child_fork_server.js
const express = require("express")
const app = express()
const { fork } = require("child_process")
app.get("/isprime", (req, res) => {
  const childProcess = fork("./forkedchild.js") //the first argument to fork() is the name of the js file to be run by the child process
  childProcess.send({ number: parseInt(req.query.number) }) //send method is used to send message to child process through IPC
  const startTime = new Date()
  childProcess.on("message", message => {
    //on("message") method is used to listen for messages send by the child process
    const endTime = new Date()
    res.json({
      ...message,
      time: endTime.getTime() - startTime.getTime() + "ms",
    })
  })
})
app.get("/testrequest", (req, res) => {
  res.send("I am unblocked now")
})
app.listen(3636, () => console.log("listening on port 3636"))
```

```javascript
// forkedchild.js
process.on("message", message => {
  //child process is listening for messages by the parent process
  const result = isPrime(message.number)
  process.send(result)
  process.exit() // make sure to use exit() to prevent orphaned processes
})
function isPrime(number) {
  let isPrime = true
  for (let i = 3; i < number; i++) {
    if (number % i === 0) {
      isPrime = false
      break
    }
  }
  return {
    number: number,
    isPrime: isPrime,
  }
}
```



## 2. Worker threads 를 통한 해결

child process 와 같이 CPU intensive 한 작업으로 인해 메인 스레드가 블로킹 되는 문제를 해결할 수 있다.

그러나 프로세스 내에서 스레드를 만들어 해결하기 때문에 fork 보다 시간과 자원소모가 적다.

```javascript
// single_thread_server.js
const express = require("express")
const app = express()
function sumOfPrimes(n) {
  var sum = 0
  for (var i = 2; i <= n; i++) {
    for (var j = 2; j <= i / 2; j++) {
      if (i % j == 0) {
        break
      }
    }
    if (j > i / 2) {
      sum += i
    }
  }
  return sum
}
app.get("/sumofprimes", (req, res) => {
  const startTime = new Date().getTime()
  const sum = sumOfPrimes(req.query.number)
  const endTime = new Date().getTime()
  res.json({
    number: req.query.number,
    sum: sum,
    timeTaken: (endTime - startTime) / 1000 + " seconds",
  })
})
app.listen(6767, () => console.log("listening on port 6767"))
```

위 서버를 실행시키고 localhost:6767/sumofprimes?number=600000 요청을 하면 50 초 동안 서버가 블로킹 된다.

600000 을 4개의 작업 구간으로 나누고 4개의 워커 스레드에서 나누어 처리하도록 아래와 같이 서버를 구성하면

서버가 블로킹되는 문제를 해결하고 CPU intensive 한 작업이 완료되는데 걸리는 시간을 줄여준다.

```javascript
// sumOfPrimesWorker.js
const { workerData, parentPort } = require("worker_threads")
//workerData will be the second argument of the Worker constructor in multiThreadServer.js
const start = workerData.start
const end = workerData.end
var sum = 0
for (var i = start; i <= end; i++) {
  for (var j = 2; j <= i / 2; j++) {
    if (i % j == 0) {
      break
    }
  }
  if (j > i / 2) {
    sum += i
  }
}
parentPort.postMessage({
  //send message with the result back to the parent process
  start: start,
  end: end,
  result: sum,
})
```

```javascript
// multi_thread_server.js
const express = require("express")
const app = express()
const { Worker } = require("worker_threads")
function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    //first argument is filename of the worker
    const worker = new Worker("./sumOfPrimesWorker.js", {
      workerData,
    })
    worker.on("message", resolve) //This promise is gonna resolve when messages comes back from the worker thread
    worker.on("error", reject)
    worker.on("exit", code => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}
function divideWorkAndGetSum() {
  // we are hardcoding the value 600000 for simplicity and dividing it
  //into 4 equal parts
  const start1 = 2
  const end1 = 150000
  const start2 = 150001
  const end2 = 300000
  const start3 = 300001
  const end3 = 450000
  const start4 = 450001
  const end4 = 600000
  //allocating each worker seperate parts
  const worker1 = runWorker({ start: start1, end: end1 })
  const worker2 = runWorker({ start: start2, end: end2 })
  const worker3 = runWorker({ start: start3, end: end3 })
  const worker4 = runWorker({ start: start4, end: end4 })
  //Promise.all resolve only when all the promises inside the array has resolved
  return Promise.all([worker1, worker2, worker3, worker4])
}
app.get("/sumofprimeswiththreads", async (req, res) => {
  const startTime = new Date().getTime()
  const sum = await divideWorkAndGetSum()
    .then(
      (
        values //values is an array containing all the resolved values
      ) => values.reduce((accumulator, part) => accumulator + part.result, 0) //reduce is used to sum all the results from the workers
    )
    .then(finalAnswer => finalAnswer)
  const endTime = new Date().getTime()
  res.json({
    number: 600000,
    sum: sum,
    timeTaken: (endTime - startTime) / 1000 + " seconds",
  })
})
app.listen(7777, () => console.log("listening on port 7777"))
```

워커 스레드를 사용하는 서버의 CPU 도 4개 모두 골고루 사용하는 것을 볼 수 있다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/137784919-d6866af4-f5b7-44e1-8304-b50c5efcb4a1.jpg" />
  <p style="font-style: italic; color: gray;">출처 - https://alvinlal.netlify.app/blog/single-thread-vs-child-process-vs-worker-threads-vs-cluster-in-nodejs</p>
</figure>



## 3. cluster 를 통한 해결

클러스터는 주로 Node.js 애플리케이션을 Scale out 할 때 사용한다.

child_process.fork() 를 사용해 자식 프로세스를 생성하고, 클라이언트의 요청을 라운드 로빈 방식으로

로드밸런싱하는 마스터-슬레이브 아키텍처를 구성한다.

이상적인 자식 프로세스 수는 CPU 코어 수와 같다.

```javascript
const cluster = require("cluster")
const http = require("http")
const cpuCount = require("os").cpus().length //returns no of cores our cpu have

if (cluster.isMaster) {
  masterProcess()
} else {
  childProcess()
}

function masterProcess() {
  console.log(`Master process ${process.pid} is running`)

  //fork workers.

  for (let i = 0; i < cpuCount; i++) {
    console.log(`Forking process number ${i}...`)
    cluster.fork() //creates new node js processes
  }
  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`)
    cluster.fork() //forks a new process if any process dies
  })
}

function childProcess() {
  const express = require("express")
  const app = express()
  //workers can share TCP connection

  app.get("/", (req, res) => {
    res.send(`hello from server ${process.pid}`)
  })

  app.listen(5555, () =>
    console.log(`server ${process.pid} listening on port 5555`)
  )
}
```

- 위 코드를 처음 실행하면 cluster.isMaster 가 되어 masterProcess() 함수가 실행된다.
- 4개의 Node.js 프로세스가 실행되고, 프로세스가 동일한 파일을 실행하지만 childProcess() 함수를 실행한다.
- childProcess() 함수가 4번 실행되고 4개의서버 인스턴스가 생성된다.