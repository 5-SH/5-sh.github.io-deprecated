---
layout: post
title: Node.js addon 을 개발하는 방법
date: 2021-06-30 12:00:00 + 0900
categories: Dev
ref: Nodejs, addon
---

# Node.js 에서 addon 을 개발하는 방법 
## 1. napi
기존 v8, libuv, nan 을 사용해 개발한 addon 모듈은 API/ABI 안정성이 보장되지 못하고 Node.js 주요 릴리즈마다 재컴파일 해야한다.   
napi 는 v8 같은 js 런타임에 독립적이고 API/ABI 안정성이 보장된다. 그리고 Node.js 버전마다 재컴파일 하지 않아도 된다.   
```cpp
#include <assert.h>
#include <node_api.h> 
static napi_value Method(napi_env env, napi_callback_info info) { 
  napi_status status; 
  napi_value world; 
  status = napi_create_string_utf8(env, "world", 5, &world); 
  assert(status == napi_ok); 
  
  return world;
} 

#define DECLARE_NAPI_METHOD(name, func)
  { name, 0, func, 0, 0, 0, napi_default, 0 } 

static napi_value Init(napi_env env, napi_value exports) { 
  napi_status status; 
  napi_property_descriptor desc = DECLARE_NAPI_METHOD("hello", Method);
  status = napi_define_properties(env, exports, 1, &desc); 
  assert(status == napi_ok); 
  return exports;
} 

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
```
#### + node-addon-api 모듈
```cpp
#include <napi.h> 

Napi::String Method(const Napi::CallbackInfo& info) { 
  Napi::Env env = info.Env(); 
  return Napi::String::New(env, "world");
} 

Napi::Object Init(Napi::Env env, Napi::Object exports) { 
  exports.Set(Napi::String::New(env, "hello"), Napi::Function::New(env, Method)); 
  return exports;
} 

NODE_API_MODULE(hello, Init)
```
napi 활용을 단순화 하는 헤더 전용 래퍼 클래스

## 2. v8, libuv 라이브러리
```cpp
// hello.cc 
#include <node.h> 

namespace demo { 
  using v8::FunctionCallbackInfo; 
  using v8::Isolate; 
  using v8::Local; 
  using v8::Object; 
  using v8::String; 
  using v8::Value; 

  void Method(const FunctionCallbackInfo<Value>& args) { 
    Isolate* isolate = args.GetIsolate(); 
    args.GetReturnValue().Set(String::NewFromUtf8(isolate, "world").ToLocalChecked()); 
  } 
  
  void Initialize(Local<Object> exports) { 
    NODE_SET_METHOD(exports, "hello", Method); 
  } 
  
  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize) 
  
} 
```

## 3. nan
Native abstractions for Node, 옛날에 사용하던 방법 
```cpp
#include <nan.h> 

void Method(const Nan::FunctionCallbackInfo<v8::Value>& info) { 
  info.GetReturnValue().Set(Nan::New("world").ToLocalChecked());
} 

void Init(v8::Local<v8::Object> exports) { 
  v8::Local<v8::Context> context = exports->CreationContext();
  exports->Set(context, 
              Nan::New("hello").ToLocalChecked(), Nan::New<v8::FunctionTemplate>(Method) ->GetFunction(context) .ToLocalChecked());
} 

NODE_MODULE(hello, Init);
```