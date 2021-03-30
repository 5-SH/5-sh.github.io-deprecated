---
layout: post
title: Bull queue 를 활용한 Job Manager 에 EventEmitter 사용하기
date: 2021-03-31 02:00:00 +0900
categories: Dev
ref: node.js
---
# Job Manager 클래스에 EventEmitter 상속하기

- ###  Consumer
    ```javascript
    const EventEmitter = require('events');
    const Queue = require('bull');
    
    class JobManager extends EventEmitter {
      constructor(name) {
      super();
        this.name = name;
        this.queue = null;
      }
      
      init() {
        if (!this.queue) {
          this.queue = new Queue(this.name, 'redis://127.0.0.1:6379');
          this.queue.process(async (job, done) => {
            const { eventId, source } = job.data;
            await this.doSomething(source);
            this.emit(eventId, 'finished');
          });
        }
      }
      
      addJob(eventId, source, callback) {
        this.queue.add({ eventId, source })
        .then(() => callback); // add event handler
      }
      doSomething(source) {
        // process with job data
      }
    }
    ```   
       
       
- ### Provider
    ```javascript
    const jobManager = new JobManager('new job');
    jobManager.init();
    jobManager.addJob(
      'new job 1', 
      source, // job data
      () => jobManager.once('new job 1', result => {
        // process result
        console.log(result); // 'finished'
    });
    ```   
    
- ### 옵저버 패턴과 EventEmitter 관계
    <img src="/storage/emulated/0/Download/FT_2021-03-31%2002_47_08.864.png" width="80%">
