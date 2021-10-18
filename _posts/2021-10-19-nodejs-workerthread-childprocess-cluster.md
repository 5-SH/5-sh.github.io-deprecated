```
---
layout: post
title: Node.js child process vs worker threads vs cluster
date: 2021-10-19 02:00:00 +0900
categories: Node.js
ref: Nodejs, child process, worker threads, cluster
---
```

# Node.js child process vs worker threads vs cluster

- Node.js 는 Http 요청에 응답하고, DB 에 데이터를 저장, 요청하고 다른 서버와 통신하는 IO 바운드 작업에 탁월하다.
- 그러나 CPU intensive 한 작업을 하면 이벤트 루프가 블로킹되어 성능이 많이 떨어진다.

아래와 같이 피보나치 값을 구하는 간단한 Node.js 서버를 만들고  

localhost:3000/getfibonacci?number=600000 로 요청하면 서버가 새로운 요청을 응답하지 않는다.

```javascript
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



