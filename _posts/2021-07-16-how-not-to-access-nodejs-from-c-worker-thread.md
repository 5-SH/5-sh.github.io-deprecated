---
layout: post
title: Node.js addon 의 worker_thread 에서 v8 메모리에 엑세스 하는 방법
date: 2021-07-16 20:00:00 + 0900
categories: [nodejs]
tags: [nodejs, addon, async, callback]
---

출처 : https://nodeaddons.com/how-not-to-access-node-js-from-c-worker-threads/    

# Node.js addon 의 worker_thread 에서 v8 메모리에 엑세스 하는 방법

**이벤트 루프(메인스레드) 외부에서 v8 메모리에 엑세스 할 수 없다.**   
애드온의 비동기 부분이 JS 에서 보낸 입력 데이터에 엑세스 하고 JS 에 출력 데이터를 반환 하려면   
아래 그림과 같이 입력/출력 데이터의 복사본을 만들어야 한다.   
[Node.js addon async callback 작성 방법 2](https://5-sh.github.io/nodejs/2021/07/16/nodejs-addon-async-callback-2.html)   

![copying](https://user-images.githubusercontent.com/13375810/125921416-9278d413-c270-4fe4-9c08-10a1f04dfafb.gif)   

위 그림의 입/출력 데이터 복사는 이벤트 루프에서 수행된다. 따라서 복사가 오래 걸리면 이벤트 루프가 블로킹 되고 메모리 낭비가 생길 수 있다.   
<br/>
이상적으로는 아래와 같이 v8 heap 의 데이터를 worker_thread 에서 공유하는 방법을 선호한다.   
그러나 아래 방법은 불가능하다.   

![inplace](https://user-images.githubusercontent.com/13375810/125933294-5c1767a8-3221-4b9c-84be-0350926fa239.gif)   

## LocalHandle
Node.js 는 JS 코드의 실행과 객체를 할당을 v8 엔진을 통해 수행한다.   
v8 은 storage cell 이라는 v8 heap 공간에 JS 객체를 할당한다.    
c++ 애드온 코드는 v8 API 의 Handle 을 생성해 storage cell 의 참조를 얻을 수 있다.   

![MemorySystem-1](https://user-images.githubusercontent.com/13375810/125935273-0d026abe-81c6-42b5-b71f-3a95a6044d6b.png)

Local<Object> target 을 통해 v8 storage cell 에 엑세스한다.   
Handle 컨테이너인 HandleScope 가 살아있는 동안 Local Handle 을 사용할 수 있다.   
HandleScope는 Mutate 함수가 종료되면 소멸자가 호출되어 사라진다.   
그리고 비동기 애드온이 처리되는 worker_thread 는 Mutate 함수가 리턴한 후 실행된다.
따라서 worker_thread 는 Local Handle 에 접근할 수 없다.    

## Persistent Handle?
Persistent Handle 은 HandleScope 가 소멸되어도 사라지지 않고 무기한으로 살아있다.   
c++ 애드온에서 Persistent Handle 을 생성하면 v8 은 Persistent handle 의 reset 메서드를 호출해   
참조를 명시적으로 해제하기 전까지 제거하지 않는다.   
<br/>

아래는  Persistent Handle 을 사용해 애드온 함수의 LocalHandle 값을 유지하는 예제이다.
```cpp
// 애드온 코드
#include <node.h>
using namespace v8;

// Stays in scope the entire time the addon is loaded.
Persistent<Object> persist;

void Mutate(const FunctionCallbackInfo<Value>& args) {
  Isolate * isolate = args.GetIsolate();
  Local<Object> target = Local<Object>::New(isolate, persist);

  Local<String> key = String::NewFromUtf8(isolate, "x");
  // pull the current value of prop x out of the object
  double current = target->ToObject()->Get(key)->NumberValue();
  // increment prop x by 42
  target->Set(key, Number::New(isolate,  current + 42));
}

void Setup(const FunctionCallbackInfo<Value>& args) {
	Isolate * isolate = args.GetIsolate();
	// Save a persistent handle to this object for later use in Mutate
	persist.Reset(isolate, args[0]->ToObject());
}

void init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "setup", Setup);
  NODE_SET_METHOD(exports, "mutate", Mutate);
}

NODE_MODULE(mutate, init)
```

```javascript
// JS 코드에서 애드온 함수 호출
const addon = require('./build/Release/mutate');

var obj = { 	x: 0  };

// save the target JS object in the addon
addon.setup(obj);
console.log(obj);  // should print 0

addon.mutate();
console.log(obj);  // should print 42

addon.mutate();
console.log(obj);  // should print 84
```

## worker_thread 추가
아래는 worker_thread 를 활용해 500ms 마다 Mutate 함수를 호출해 인자로 전달된 x 값을 수정하는 예제이다.    
JS 코드에서 전달된 인자는 Persistent Handle 로 유지한다.   

```cpp
// 애드온 코드
#include <node.h>
#include <chrono>
#include <thread>
using namespace v8;

// Stays in scope the entire time the addon is loaded.
Persistent<Object> persist;

void mutate(Isolate * isolate) {
	while (true) {
		std::this_thread::sleep_for(std::chrono::milliseconds(500));
		// we need this to create a handle scope, since this
		// function is NOT called by Node.js
		v8::HandleScope handleScope(isolate);
		Local<String> key = String::NewFromUtf8(isolate, "x");
		Local<Object> target = Local<Object>::New(isolate, persist);
		double current = target->ToObject()->Get(key)->NumberValue();
		target->Set(key, Number::New(isolate,  current + 42));
  	}
}

void Start(const FunctionCallbackInfo<Value>& args) {
  Isolate * isolate = args.GetIsolate();
  persist.Reset(isolate, args[0]->ToObject());

  // spawn a new worker thread to modify the target object
  std::thread t(mutate, isolate);
  t.detach();
}

void init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "start", Start);
}

NODE_MODULE(mutate, init)
```

```javascript
// 애드온 호출 코드
const addon = require('./build/Release/mutate');

var obj = { 	x: 0  };

addon.start(obj);

setInterval( () => {
	console.log(obj)
}, 1000);

// 결과
> node mutate.js
Segmentation fault: 11
```

worker_thread 는 v8 Heap 영역(isolate)의 인스턴스에 접근할 수 없다.   

## v8 Locker
위 예제에서 v8 isolate 영역은 공유된 자원이다. 그리고 v8 Locker 는 c++ mutex 와 비슷한 공유된 자원의 잠금이다.   
v8 Locker 가 생성되면 다른 스레드가 isolate 에 접근하지 못하도록 잠근다.   
그리고 v8 Locker 가 소멸하면 잠금을 해제해 다른 스레드에서 isolate 에 접근할 수 있다.   
<br/>
아래는 worker_thread 에서 동작하는 mutate 함수에서 잠금을 추가하는 코드이다.

```cpp
void mutate(Isolate * isolate) {
	while (true) {
    std::this_thread::sleep_for(std::chrono::milliseconds(500));

    std::cerr << "Worker thread trying to enter isolate" << std::endl;
    v8::Locker locker(isolate);
    isolate->Enter();

    std::cerr << "Worker thread has entered isolate" << std::endl;
    // we need this to create local handles, since this
    // function is NOT called by Node.js
    v8::HandleScope handleScope(isolate);
    Local<String> key = String::NewFromUtf8(isolate, "x");
    Local<Object> target = Local<Object>::New(isolate, persist);
    double current = target->ToObject()->Get(key)->NumberValue();
    target->Set(key, Number::New(isolate,  current + 42));

    // Note, the locker will go out of scope here, so the thread
    // will leave the isolate (release the lock)
  }
}

// 결과
> node mutate.js
Worker thread trying to enter isolate
{ x: 0 }
{ x: 0 }
{ x: 0 }
{ x: 0 }
{ x: 0 }
{ x: 0 }
{ x: 0 }
^C
```

그러나 worker_thread 에서 잠금을 획득하지 못한다.   
왜냐하면 메인스레드에서 실행하는 Node.js 의 StartNodeInstance 메서드 내부에서 isolate 에 잠금을 설정하기 때문이다.   
```cpp
// Excerpt from https://github.com/nodejs/node/blob/master/src/node.cc#L4096
static void StartNodeInstance(void* arg) {
  ...
  {
    Locker locker(isolate);  
    Isolate::Scope isolate_scope(isolate);
    HandleScope handle_scope(isolate);
    
	//... (lines removed for brevity...)

    {
      SealHandleScope seal(isolate);
      bool more;
      do {
        v8::platform::PumpMessageLoop(default_platform, isolate);
        more = uv_run(env->event_loop(), UV_RUN_ONCE);

        if (more == false) {
          v8::platform::PumpMessageLoop(default_platform, isolate);
          EmitBeforeExit(env);
          more = uv_loop_alive(env->event_loop());
          if (uv_run(env->event_loop(), UV_RUN_NOWAIT) != 0)
            more = true;
        }
      } while (more == true);
    }
    ....
```

**Node.js 는 메인스레드를 시작하기 전에 isolate 잠금을 획득하고 해제하지 않는다.   
따라서 isolate 는 프로그램의 전체 수명 동안 잠금을 유지하며 다른 스레드의 엑세스를 허락하지 않는다.**   

## Unlocker
메인스레드에서 Unlocker 를 사용해 isolate 의 잠금을 해제하면 worker_thread 에서 접근할 수 있다.   
```cpp
// Remember - this is called in the event loop thread
void Start(const FunctionCallbackInfo<Value>& args) {
	Isolate * isolate = args.GetIsolate();
	persist.Reset(isolate, args[0]->ToObject());

	// spawn a new worker thread to modify the target object
	std::thread t(mutate, isolate);
	t.detach();

	// This will allow the worker to enter...
	isolate->Exit();
	v8::Unlocker unlocker(isolate);
}
```

그러나 이 코드를 실행하면 Start 함수가 반환 하자마자 세그멘테이션 에러가 발생한다.   
메인스레드에서 isolate 의 잠금은 해제하지만, 메인스레드의 함수가 종료되며 isolate 영역을 해제하기 때문이다.   
따라서 메인스레드의 Start 함수의 반환을 지연하면 worker_thread 가 isolate 영역에 접근할 수 있게된다.   

```cpp
void Start(const FunctionCallbackInfo<Value>& args) {
  ...
  isolate->Exit();
  v8::Unlocker unlocker(isolate);

  // as soon as we return, Node's going to access v8 which
  // will crash the program. so we can stall...
  while (1);
}

// 결과
> node mutate.js
Worker thread trying to enter isolate
Worker thread has entered isolate
Worker thread trying to enter isolate
Worker thread has entered isolate
...
```

## 전체 코드
```cpp
void Start(const FunctionCallbackInfo<Value>& args) {
	Isolate * isolate = args.GetIsolate();
	persist.Reset(isolate, args[0]->ToObject());

	// spawn a new worker thread to modify the target object
	std::thread t(mutate, isolate);
	t.detach();
}

void LetWorkerWork(const FunctionCallbackInfo<Value> &args) {
	Isolate * isolate = args.GetIsolate();
	{
		isolate->Exit();
  		v8::Unlocker unlocker(isolate);

		// let worker execute for 200 seconds
		std::this_thread::sleep_for(std::chrono::seconds(2));
	}
	//v8::Locker locker(isolate);
	isolate->Enter();
}
```

```javascript
const addon = require('./build/Release/mutate');

var obj = { 	x: 0  };

addon.start(obj);

setInterval( () => {
	addon.let_worker_work();
	console.log(obj)
}, 1000);
```

```shell
> node mutate.js
Worker thread trying to enter isolate
Worker thread has entered isolate
Worker thread trying to enter isolate
Worker thread has entered isolate
Worker thread trying to enter isolate
{ x: 84 }
Worker thread has entered isolate
Worker thread trying to enter isolate
Worker thread has entered isolate
{ x: 168 }
Worker thread trying to enter isolate
Worker thread has entered isolate
Worker thread trying to enter isolate
Worker thread has entered isolate
{ x: 252 }
...
```

## 결론
v8 에 저장된 입/출력 데이터를 복사하지 않고 비동기 애드온 함수를 실행하려 했다.   
v8 Heap 영역의 객체를 메인스레드와 worker_thread 에서 공유하려 하면,   
메인스레드가 sleep 상태일 떄만 worker_thread 에서 v8 Heap 영역에 접근할 수 있다.   
이 방법은 비효율 적이기 때문에 [v8 에 저장된 입/출력 데이터를 복사해 비동기 애드온 함수를   
실행하는 방법을 사용해야 한다.](https://5-sh.github.io/nodejs/2021/07/16/nodejs-addon-async-callback-2.html)