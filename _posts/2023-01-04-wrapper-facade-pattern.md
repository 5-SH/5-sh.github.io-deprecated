---
layout: post
title: Wrapper facade 패턴
date: 2023-01-04 20:30:00 + 0900
categories: [patterns]
tags: [patterns, wrapper, facade]
---

출처1 : https://www.youtube.com/watch?v=q-KfKdLdXSM&list=PLs4Vf-D53YHm6MA7ZHnYoxD2sAn9NOBZr&ab_channel=YoungSuSon    
출처2 : Head first design pattern   
출처3 : https://refactoring.guru/ko/design-patterns/bridge   

# Wrapper facade 패턴

## 1. Wrapper facade 패턴 정의
클라이언트가 서버에 연결해 데이터를 저장하는 서비스를 만든다고 할 때,   
서비스를 row level API 로 개발하면 threading, synchronize, network communication function 등을 모두 직접 구현해야 합니다.   
그러면 서비스에 에러가 발생하기 쉽고 OS 가 달라지면 그에 맞게 수정해야 하는 등의 문제가 발생합니다.    

이런 문제가 발생하지 않도록 객체지향적으로 잘 개발하기 위해 facade 패턴을 사용합니다.     
facade 패턴을 사용해 서브시스템들이 제공하는 일련의 인터페이스(row level API)에 대한 통합된 인터페이스를 만들어,   
클라이언트와 서브시스템(threading, synchronize, network 등)이 서로 긴밀하게 연결되지 않도록 할 수 있습니다.    

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/210588123-28472dee-4d7e-4316-8498-29a6c9dd932a.jpg" width="75%"/>
</figure>  

## 2. 최소 지식 원칙(데미테르 원칙)
객체 사이의 상호작용을 줄이기 위한 원칙입니다. 객체는 상호작용을 하는 클래스의 개수에 주의해야 하고     
어떤 방법으로 상호작용을 하는지도 주의해야 합니다.    

객체간 상호작용을 줄이기 위해 아래 네 종류의 객체의 메소드만을 호출합니다.
- 객체 자체(this)
- 메소드에 매개변수로 전달된 객체

```java
public void start(Key key) {
  ...
  boolean authorized = key.turns();
  ...
}
```

- 메소드에서 생성하고나 인스턴스를 만든 객체

```java
public void start(Key key) {
  ...
  Doors doors = new Doors();
  doors.lock();
  ...
}
```

- 객체에 속하는 구성요소

```java
public class Car {
  Engine engine;
  ...
  public void start(Key key) {
    ...
    engine.start();
    ...
  }
}
```

따라서 아래와 같이 다른 메소드를 호출해서 리턴 받은 객체의 메소드를 호출하는 것도 바람직한 메소드 호출 방법이 아닙니다.   

```java
public float getTemp() {
  Thermometer thermometer = station.getThermometer();
  return thermometer.getTemperature();
}
```

stations 으로 부터 therometer 라는 객체를 직접 받는 대신 Station 클래스에 thermometer 요청을 해주는 메소드를 추가해 호출하는 것이 바람직 합니다.

```java
public float getTemp() {
  return station.getTemperature();
}
```

다른 구성요소에 대한 메소드 호출을 처리하기 위해 Wrapper facade 패턴을 사용해    
최소 지식 원칙을 잘 따르면 객체 사이의 의존성을 줄일 수 있습니다.    

## 3. Facade vs Adator vs Bridge vs Decorator
Facade 패턴은 브릿지, 어댑터, 데코레이터 패턴과 구조와 동작이 비슷해 혼동될 수 있습니다.    
하지만 각 패턴을 사용하는 배경과 목적이 다릅니다.    

Facade 패턴은 __단순화된 인터페이스__ 를 제공해 서브시스템을 더 쉽게 사용하기 위한 용도로 쓰입니다     
어댑터 패턴은 어떤 인터페이스를 클라이언트에서 요구하는 __인터페이스에 맞도록 변환__ 하기 위한 용도로 쓰입니다.   

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/210588618-d158c58b-02df-4812-b30a-45688a8a2ec0.jpg" width="75%"/>
  <p style="font-style: italic; color: gray;">어댑터 패턴</p>
</figure> 

브릿지 패턴은 __구현 뿐만 아니라 추상화된 부분까지 변경__ 시켜야 하는 경우 브릿지 패턴을 사용합니다.    
한 객체를 관심사에 따라 구현과 추상화된 부분으로 분리했지만 구체적인 구현 부분과 추상화된 부분을 모두 바꿔야하는 경우가 생길 수 있습니다.   
이 경우 추상화된 부분과 구현 부분을 서로 다른 클래스 계층 구조에 집어 넣어 그 둘을 모두 수정할 수 있습니다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/210588823-9d8cb0b9-82f0-4711-8ffc-5c6cd3e4d078.jpg" width="75%"/>
  <p style="font-style: italic; color: gray;">브릿지 패턴</p>
</figure> 

데코레이터 패턴은 __서브클래스를 만드는 것을 통해 기능을 유연하게 확장__ 할 때 사용합니다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/210588947-5b906aa5-8fcf-4659-9169-19188ad4b3f5.jpg" width="75%"/>
  <p style="font-style: italic; color: gray;">데코레이터 패턴</p>
</figure> 