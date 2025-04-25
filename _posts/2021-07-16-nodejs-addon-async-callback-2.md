---
layout: post
title: Node.js addon async callback 작성 방법 2
date: 2021-07-16 17:00:00 + 0900
categories: [nodejs]
tags: [nodejs, addon, async, callback]
---

출처 : https://nodeaddons.com/c-processing-from-node-js-part-4-asynchronous-addons/

# Node.js addon async callback 작성 방법 2

## 왜 비동기인가?
일부 무거운 계산의 속도를 위해 c++ 사용할 가능성이 높다.    
그러나 JS 에서 동기적으로 실행되는 c++ 애드온을 호출하면 이벤트 루프(메인 스레드)가 블로킹 되어 중단되는 문제가 발생한다.   
따라서 강수량의 평균을 구하는 애드온을 비동기로 처리하도록 수정해 이벤트 루프의 블로킹을 막는다.   

```javascript
// require the C++ addon
var rainfall = require("./cpp/build/Release/rainfall");
...
// call into the addon, blocking until it returns
var results = rainfall.calculate_results(locations);
print_rain_results(results);

// --->

rainfall.calculate_results_async(locations, print_rain_results);
// we can continue here, before the callback is invoked.
```

## c++ 애드온 코드
### 애드온 모듈 등록
JS 에서 애드온 모듈의 함수를 호출하기 위해 등록한다.

```javascript
// in node_rainfall.cc
void CalculateResultsAsync(const v8::FunctionCallbackInfo<v8::Value>&args) {
    Isolate* isolate = args.GetIsolate();

     // we'll start a worker thread to do the job 
     // and call the callback here...

    args.GetReturnValue().Set(Undefined(isolate));
}
...
void init(Handle <Object> exports, Handle<Object> module) {
  ...
   NODE_SET_METHOD(exports, "calculate_results_async", CalculateResultsAsync); 
}
```

CalculateResultAsync 함수는 메인 스레드에서 실행되며, libuv 를 통해 worker_thread 를 실행하는 코드이다.   
worker_thread 에 작업을 요청하고 콜스택에서 사라지고 종료된다.

### worker_thread 모델
worker_thread 가 v8 에서 어떻게 동작하는지 개요를 살펴본다.   
이벤트 루프(메인스레드와) worker_thread 두 개가 있다.   
<br/>
메인스레드의 JS 코드에서 calculate_result_async 함수를 호출하고 호출된 함수 내에서    
c++ 애드온 함수인 CaculateResultAsync 함수를 호출한다. CaculateResultAsync 함수도 메인스레드에서 실행된다.   
<br/>
CaculateResultAsync 함수는 libuv 를 통해 worker_thread 에서 workerAsync 함수가 실행되도록 한다.   
그리고 libuv 는 workerAsync 가 완료되면 workerAsyncCallback 함수가 메인스레드의 콜스택에서 실행되도록 한다.   
<br/>
메인스레드의 JS, 애드온 코드가 완료된 후에도 worker_thread 에서 인자에 접근하기 위해   
Worker 구조체를 활용한다.   

- Work : 작업이 완료될 떄 호출할 수 있는 입력(locations), 출력(rain_results) 및 콜백 함수를 저장한다.
- CaculateResultAsync : 메인스레드에서 실행되고 입력을 추출해 Work 에 저장한다.
- WorkAsync : worker_thread 가 실행할 함수. CalculateResultAsync 함수에서 libuv API(uv_queue_work) 를 사용해 실행한다.   
- workAsyncComplete : worker_thread 가 완료되면 libuv 가 호출하는 함수. 메인스레드에서 실행된다.

![FT_2021-07-16 16_29_23 369](https://user-images.githubusercontent.com/13375810/125912898-851d184d-e69e-4b47-84ec-cc40116dba71.png)

### Work 구조체와 CalculateResultAsync 함수

```cpp
struct Work {
  uv_work_t  request;
  Persistent<Function> callback;

  std::vector<location> locations;
  std::vector<rain_result> results;
};

void CalculateResultsAsync(const v8::FunctionCallbackInfo<v8::Value>&args) {
  Isolate* isolate = args.GetIsolate();
    
  Work * work = new Work();
  work->request.data = work;
  ...
  // extract each location (its a list) and store it in the work package
  // work (and thus, locations) is on the heap, 
  // accessible in the libuv threads
  Local<Array> input = Local<Array>::Cast(args[0]);
  unsigned int num_locations = input->Length();
  for (unsigned int i = 0; i < num_locations; i++) {
    work->locations.push_back(
      unpack_location(isolate, Local<Object>::Cast(input->Get(i)))
    );
  }
  
  // store the callback from JS in the work package so we can 
  // invoke it later
  Local<Function> callback = Local<Function>::Cast(args[1]);
  work->callback.Reset(isolate, callback);

  // kick of the worker thread
  uv_queue_work(uv_default_loop(),&work->request,
    WorkAsync,WorkAsyncComplete);
    
  args.GetReturnValue().Set(Undefined(isolate));
}
```

### worker_thread 코드
```cpp
static void WorkAsync(uv_work_t *req) {
  Work *work = static_cast<Work *>(req->data);

  // this is the worker thread, lets build up the results
  // allocated results from the heap because we'll need
  // to access in the event loop later to send back
  work->results.resize(work->locations.size());
  std::transform(work->locations.begin(), 
          work->locations.end(), 
          work->results.begin(), 
          calc_rain_stats);

  // that wasn't really that long of an operation, 
  // so lets pretend it took longer...

  sleep(3);
}
```

### 작업이 완료된 후 호출되는 콜백 함수
```cpp
// called by libuv in event loop when async function completes
static void WorkAsyncComplete(uv_work_t *req,int status) {
  Isolate * isolate = Isolate::GetCurrent();
  v8::HandleScope handleScope(isolate); // Required for Node 4.x
    
  Work *work = static_cast<Work *>(req->data);

  // the work has been done, and now we pack the results
  // vector into a Local array on the event-thread's stack.
  Local<Array> result_list = Array::New(isolate);
  for (unsigned int i = 0; i < work->results.size(); i++ ) {
    Local<Object> result = Object::New(isolate);
    pack_rain_result(isolate, result, work->results[i]);
    result_list->Set(i, result);
  }

  ...

  // set up return arguments
  Handle<Value> argv[] = { result_list };
    
  // execute the callback
  Local<Function>::New(isolate, work->callback)->
    Call(isolate->GetCurrentContext()->Global(), 1, argv);
    
  // Free up the persistent function callback
  work->callback.Reset();
   
  delete work;
}
```

