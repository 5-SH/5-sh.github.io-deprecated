---
layout: post
title: child_process - spawn(), exec(), execFile() fork() in Node.js
date: 2022-08-31 19:00:00 + 0900
categories: [nodejs]
tags: [nodejs, child_process, spawn, exec, execfile, fork]
---

# child_process - spawn(), exec(), execFile() fork() in Node.js
child_process 에는e xecFile(), spawn(), exec(), fork() 네 함수가 존재한다.   
네 함수 모두 ChildProcess Object 를 리턴하고 ChildProcess Object 의 명세는 아래와 같다.    

| ChildProcess |   
|:----------- |   
| close<Event><br/>exit<Event></br>error<Event> |   
| stderr<Stream \| String><br/>stdin<Stream \| String><br/>stdout<Stream \| String><br/>stdio\<Array> |    

## 1. exec()
__child_process.exec(command[, options][, callback])__    

- spawns a shell and execute the command in that shell.
- buffer generated data.
- callback function will be called with buffered data.
- it does not have an args argument. 
- if we need to pass arguments to the command, they should be part of  the whole command string.
- allows to execute more than one commadn on a shell.

```javascript
const { exec } = require('child_process');

exec('cat *.js | wc -l', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
```

exec should be used when we need to utilize shell functionality    
such as pipe, redirects, backgrounding...

## 2. execFile()
__child_process.execFile(file[, args][, options][, callback])__   

- executes an external application with optional arguments.
- it does not spawn a shell by default.
- since shell is not spawned behavior such as I/O redirection and file globbing are not supported.
- support callback with the buffered output after the application exits.
- decode the stdout and stderr output as UTF-8 and pass strings to the callback

```javascript
const { execFile } = require('child_process');
const child = execFile('node', ['--version'], (error, stdout, stderr) => {
  if (error) throw error;
  console.log(stdout);
});
```

execFile is used when we just need to execute an application and get the output.   
execFile should not be used when the external application produces a large amount of   
data and we need to consume that data in real time manner.

## 3. spawn()
__child_process.spawn(command[, args][, options])__   

- spawns an external application in a new process 
- returns a streaming interface for I/O

```javascript
const { spawn } = require('child_process');
const fs = require('fs');
function resize(req, resp) {
  const args = [
    "-",
    "-resize", "640x",
    "-resize", "x360",
    "-gravity", "center",
    "-crop", "640X360+0+0",
    "-"
  ];

  const streamIn = fs.createReadStream('./path/to/an/image');
  const proc = spawn('convert', args);
  streamIn.pipe(proc.stdin);
  proc.stdout.pipe(resp);
}
```

As spawn returns a stream based object, it's great for handling applications that   
produce large amounts of data or for working with data as it reads in.    
all stream benefits apply as well.

## 4. fork()
__child_process.fork(modulePath[, args][, options])__    

- it is a special case of child_process.spawn().
- used specifically to spawn new Node.js processes.
- it returns ChildProcess object.
- returned ChildProcess has an additional communication channel.
- additional IPC channel allows messages to be paseed between parent and child.
- parent and child process has it's own memory.
- spawned Node.js child processes are independent of the parent with    
  exception of the IPcommunication channel.
- unlike the fork(2) POSIX system call, child_process.fork() does not clone the current process.

```javascript
// parent.js
const { fork } = require('child_process');

const child = fork(`${__dirname}/child.js`);

child.on('message', m => console.log('parent got message:', m));
child.send({ hello: 'world' });

// child.js
process.on('message', m => console.log('child got message:', m));
process.send({ foo: 'bar' });
```

Long-running tasks will tie up the Node.js's main thread.    
since Node.js is single threaded, incomingrequests can't be serviced and    
the application becoms unresponsive.    
forking a new Node.js process allows the application to serve incoming requests    
and stay responsive.

<br/>

### Q1) exec, execFile 에서 리턴하는 ChildProcess 오브젝트는 stdin, stdout stream 을 사용할 수 없을까?   

```javascript
const { exec } = require('child_process');

// large-sample-text-file.txt size is 10MB
exec('cat large-sample-text-file.txt', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});

child.stdout.on('data', d => console.log(d));
```

```javascript
const { execFile } = require('child_process');

// large-sample-text-file.txt size is 10MB
execFile('cat', ['large-sample-text-file.txt'], (error, stdout, stderr) => {
  if (error) {
    console.error(`execFile error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});

child.stdout.on('data', d => console.log(d));
```

위 코드를 실행하면, 콜백 함수 내 stdout 은 버퍼 형식으로 받아오기 때문에    
[ERR_CHILD_PROCESS_STDIO_MAXBUFFER]: stdout maxBuffer length exceeded 에러가 발생한다.    
하지만 ChildProcess 오브젝트의 child.stdin stream 을 통해서는 정상적으로 받아올 수 있다.

### Q2) execFile, spawn 은 shell 에서 동작하지 않는가?   

```javascript
const { spawn } = require('child_process');
const cat = spawn('cat', ['*.js']);

cat.stdout.on('data', data => console.log(`stdout: ${data}`));
cat.stderr.on('data', data => console.log(`stderr: ${data}`));
cat.on('close', code => console.log(`child process exited with code ${code}`));
```

위 코드를 실행하면 stderr: cat: '*.js': 그런 파일이나 디렉터리가 없습니다. 에러가 발생한다.   
'*.js' 는 shell 에서 지원하는 globbing 인데 execFile, spawn 은 기본적으로 shell 에서 동작하지 않기 때문이다.   
spawn, execFile 의 옵션 인자에 { shell: true } 를 추가하면 커맨드가 shell 에서 동작하고    
정상 실행되는 것을 확인할 수 있다. 

##### 출처
- dzone.com/atriclesunderstanding-execfile-spawn-exec-and-fork-in-node      
- nodejs.org/api/child_process.;
