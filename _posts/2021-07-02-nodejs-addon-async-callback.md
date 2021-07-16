---
layout: post
title: Node.js addon async callback 작성 방법 1
date: 2021-07-02 20:00:00 + 0900
categories: Nodejs
ref: Nodejs, addon, async, callback
---

출처 : https://z-wony.tistory.com/18 

# Node.js addon async callback 작성 방법 1

## 1. 파라미터로 받은 Function 객체를 Synchronous 하게 call
### js 함수명: directCall, c++ 함수명: MeethodFunc

```cpp
void MethodFunc(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // 콜백 함수가 파라미터로 넘어오지 않으면 에러 발생
  if (args.Length() < 1 || !args[0]->IsFunction()) {
    Local<String> err_msg = String::NewFromUtf8(isolate, "Invalid Parameter");
    Local<Value> exception = v8::Exception::Error(err_msg);
    isolate->ThrowException(exception);
    return;
  }

  Local<Function> cb = Local<Function>::Cast(args[0]);
  // "->" 연산자로 Function Class instance 참조해 Function Class 의 Call 메소드 호출
  cb->Call(Null(isolate), 0, NULL);
}
```

### 테스트를 위한 js 코드

```javascript
const m = require('./test.node');

console.log('----- Test 02 directCall positive -----');
m.directCall(function (text) {
  console.log('In callback: ' + text);
});
console.log('----------------------------');
console.log();

console.log('----- Test 02 directCall negative -----');
try {
  m.directCall('');
} catch (err) {
  console.error('catch: ' + err);
}
console.log('----------------------------');
```

### 결과   
```
----- Test 02 directCall positive -----
In callback: undefined
----------------------------

----- Test 02 directCall negative -----
catch: Error: Invalid Parameter
----------------------------
```
<br/>

## 2. 파라미터로 받은 Function 객체를 Asynchronous 하게 call
libuv 의 timer 를 사용해 다음 event loop 에서 callback 이 호출되는 상황을 구현한다.

### js 함수명: asyncCall, c++ 함수명: MethodTimer
```cpp
void MethodTimer(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 1 || !args[0]=>IsFunction()) {
    Local<String> err_msg = String:NewFromUtf8(isolate, "Invalid Parameter");
    Local<Value> exception = v8:Exception:Error(err_msg);
    isolate->ThrowException(exception);
    return;
  }

  // Node.js 에서 동작하는 libuv 의 default loop 를 가져와서 uv timer handle 을 초기화 한다.
  uv_loop_t* loop = uv_default_loop();
  uv_timer_t* timer = (uv_timer_t *)malloc(sizeof(uv_timer_t));
  uv_timer_init(loop, timer);

  Local<Function> cb = Local<Funtion>::Cast(args[0]);

  // Persistent<Function> 을 new 로 생성하면서 Local<Function> 을 인자로 전달한다.
  // js 함수에게 받은 Function Object(args[0] == Local<Function> cb) 가
  // MethodTimer 함수가 종료되어 지역 변수 영역이 소멸되어도 GC 되지 않도록 한다.
  Persistent<Function> *pf = new Persistent<Function>(isolate, cb);
  // Persistent<Function> 을 libuv timer 함수에서 사용하기 위해 timer->data 에 보관
  timer->data = (void *)pf;

  // Async Timer 실행
  uv_timer_start(timer, _timer_cb, 1000, 1000);
}

static int g_timer_count = 0;
static int g_timer_max = 2;

void _timer_cb(uv_timer_t *timer) {
  Isolate *isolate = Isolate::GetCurrent();

  // HandleScope Class 를 선언해 LocalHandle 이 생성될 수 있고 _timer_cb 함수
  // 종료 시 GC 가 메모리를 관리할 수 있게 한다.
  HandleScope handle_scopt(isolate);
  Persistent<Function> *pf = (Persistent<Function> *)timer->data;

  Local<Value> argv[1] = {
    String::NewFromUtf8(isolate, "Timer invoked")
  };

  Local<Object> global= isolate->GetCurrentContext()->Global();
  // c++ 의 new 가 아닌 Local Class 의 New 함수를 사용.
  // 실제 Object 의 메모리 주소를 Handle 두 개가 참조하고 있다.
  // 참조를 모두 해제해야 GC 가 메모리를 해제할 수 있다.
  Local<Function> callback = Local<Function>::New(isolate, *pf);

  callbck->Call(global, 1, argv);

  // _timer_cb 가 두 번 호출되도록 한다.
  g_timer_count++;
  if (g_timer_count >= g_timer_max) {
    // 두 번째 호출 되었을 때 Persistent<Function> 의 Rest() 함수를 호출해 메모리 참조를 초기화 한다.
    // 이제 _timer_cb 가 종료되면 handle_scope 의 소멸자가 호출되고
    // Local<Function> callback 의 메모리 참조도 초기화 된다.
    // 실제 Object 의 메모리를 아무도 참조하지 않게 되참 메모리가 반환된다.
    pf->Rest();
    delete pf;

    // timer 을 중단하고 timer handle 의 메모리를 해제
    uv_timer_stop(timer);
    free(timer);
  }
}
```

### 테스트를 위한 js 코드
```javascript
const m = require('./test.node');

console.log('----- Test 03 asyncCall positive -----');
m.asyncCall(function (text) {
  console.log('In async callback: ' + text);
});
console.log('---------------------------');
console.log();
```

### 실행 결과
```
----- Test 03 asyncCall positive -----
---------------------------

In async callback: Timer invoked
In async callback: Timer invoked
```
