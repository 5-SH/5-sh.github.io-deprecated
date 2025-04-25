---
layout: post
title: Node.js addon Handle
date: 2021-07-01 07:00:00 + 0900
categories: [nodejs]
tags: [nodejs, addon, handle]
---

출처1 : https://z-wony.tistory.com/18   
출처2 : https://kariera.future-processing.pl/blog/a-curious-case-of-memory-leak-in-a-node-js-app/

# Node.js addon Handle

## v8 의 Handle (memory) 관리 방법
v8 GC 에서 관리하는 객체 참조.   
v8 에서 생성된 객체는 GC 가 살아있는지 추적한다. 그리고 GC 가 객체의 메모리에 저장된 위치를 옮길 수 있기 때문에 객체를 직접 참조하는 것은 안전하지 않다. 그래서 모든 객체는 GC 가 알고있는 Handle 에 저장되고 객체가 이동될 때 마다 업데이트 된다. Handle 은 항상 값으로 전달되어야 하고 Heap 에 할당되지 않아야 한다.   
Handle 은 LocalHandle 과 PersistentHandle 이 있다.   
<br/>

### 1. LocalHandle : 함수 내에서 지역변수처럼 쓴다.  
stack 에 보관된다. 동적 할당이 불가하고 지역 변수로만 사용 가능한 HandleScope 에 의해 관리된다. 따라서 c++ 함수가 끝날 때, 지역 변수로 선언된 HandleScope 클래스의 소멸자가 호출되어 c++ 스코프인 { }안에서만 유효할 수 있다.

```cpp
void exampleFunction() { 
    HandleScope scope; 
    Local<Integer> value = Integer::New(Isolate::GetCurrent(), 0);
}
```

![exampleFunctionExecution](https://user-images.githubusercontent.com/13375810/124052097-b85cd180-da58-11eb-977b-0d588acc191f.gif)
<br/>

### 2. PersistentHandle
HandleScope 와 독립적인 객체 참조.   
Heap 에 할당된 JavaScript 객체들을 참조할 수 있다. 참조 시 GC 에 의해 해제되지 않도록 한다. Reset() 함수를 Call 해 명시적으로 해제해야 한다.   
LocalHandle 은 실제 객체에 접근할 수 있도록 '->', '*' 연산자 오버라이딩을 제공하지만 PersistentHandle 은 제공하지 않는다. PersistentHandle 은 메모리의 Lifetime 연장에만 사용 후 다시 LocalHandle 로 받아서 사용해야 한다.
<br/>

### 3. v8 HandleScope 소스코드
![hs1](https://user-images.githubusercontent.com/13375810/124055244-82225080-da5e-11eb-8906-7aea8d13646b.png)   

생성자에서 insolate 의 handle scope data 에 있는 메모리 포인터를 가져오고 level 값을 올려준다.   

![hs2](https://user-images.githubusercontent.com/13375810/124055422-d4637180-da5e-11eb-8439-0fdfcd546d24.png)   

소멸자 호출 시 level 값을 줄이고 보관했던 memory 주소를 복원한다. 그리고 HandleScopeImplementer::DeleteExtensions() 를 호출한다.   

![hs3](https://user-images.githubusercontent.com/13375810/124055533-0aa0f100-da5f-11eb-8c20-f3786a90303d.png)   

DeleteExtensions 는 HandleScope 의 메모리 블록을 페이지 단위로 다 빌 때 까지 해제해 준다.
<br/>

### 4. EscapableHandleScope
EscapableHandleScope 는 스택의 현재 Handle 범위보다 한 단계 아래에 있는 Handle 에 새 LocalHandle 을 만들재, 매개변수로 전달된 값을 새로 만든 Handle 에 복사해 참조된 객체에 여전히 접근할 수 있도록 한다.

```cpp
Local<Integer> returningFunction() { 
    EscapableHandleScope scope; 
    Local<Integer> zeroValue = Integer::New(Isolate::GetCurrent(), 0); 
    Local<Integer> oneValue = Integer::New(Isolate::GetCurrent(), 1); 
    
    return scope.Escape(oneValue);
}
```

zeroValue Handle 이 참조하는 객체는 returningFunction() 이 끝난 후 GC 되지만 oneValue 핸들이 참조하는 객체는 GC 되지 않는다.   
그리고 HandleScope 를 선언한 함수에서 LocalHandle 을 반환할 수 없다. 함수가 반환되기 직전에 HandleScope 의 소멸자에 의해 삭제되기 때문이다.   
따라서 HandleScope 대신 EscapableHandleScope 를 생성하고 HandleScope 에서 Escape 메서드를 호출해 값을 반환할 Handle 을 전달한다.

![returningFunction-execution](https://user-images.githubusercontent.com/13375810/124079764-86f9fb00-da84-11eb-968c-9b30c0be927c.gif)

