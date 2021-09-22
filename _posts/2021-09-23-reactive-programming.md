---
layout: post
title: reactive programming
date: 2021-09-23 23:30:00 + 0900
categories: Patterns
ref: Patterns, reactive programming, flow, flux
---

# 리액티브 프로그래밍
- 끝임없이 들어오는 데이터의 스트림을 비동기 논블로킹 병렬처리 하기 위해 사용하는 프로그래밍이다.   
- 메모리 내 데이터를 반복해서 처리하지 않고 스트림으로 처리하기 때문에 메모리를 더 효율적으로 사용한다.   
- Publisher 와 Subscriber 가 있고 Publisher 는 Subscriber 가 비동기 적으로 구독하는 데이터 스트림을 게시한다.   
- Processor 를 통해 스트림에서 동작하는 함수를 도입하는 메커니즘을 제공한다.   
Processor 는 Publisher 와 Subscriber 사이에 위치하며 데이터의 한 스트림을 다른 스트림으로 변환한다.   

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/134385538-698888bb-9a57-419b-9846-2f0a3eeec880.jpg" />
  <figcaption>출처 - https://jhleed.tistory.com/99</figcaption>
</figure>


## 1. Reactive Streams
- 비동기적 스트림을 논블로킹 back pressure 로 처리하는 스펙이다.   
- JDK9 java.util.concurrent.Flow 는 자바에서 만든 Reactive Streams 스펙에 해당하는 인터페이스(API)이다.   
- WebFlux 는 스프링5 에서 리액티브 프로그래밍을 위해 추가된 모듈이다.

## 2. java.util.concurrent.Flow

```java
@FunctionalInterface
public static interface Flow.Publisher<T> {
  public void subscribe(Flow.Subscriber<? super T> subscriber);
}

public static interface Flow.Subscriber<T> {
  public void onSubscribe(Flow.Subscription subscription);
  public void onNext(T item);
  public void onError(Throwable throwable);
  public void onComplete();
}

public static interface Flow.Subscription {
  public void request(long n);
  public void cancel();
}

public static interface Flow.Processor<T, R> extends Flow.Subscriber<T>, Flow.Publisher<R> {}
```

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/134388511-7727b796-5cd3-4d6e-aaa9-e2fdf36a2ebf.png" />
  <figcaption></figcaption>
</figure>

## 3. WebFlux

- Flux : Publisher<T> 구현체, N 개의 데이터를 subscriber.onNext 로 전달한다. 완료되면 subscriber.onComplete() 를 호출한다.
- Mono : Publisher<T> 구현체, 0, 1 개의 데이터를 전달한다.
- flux.subscribe 을 실행해야 데이터를 전달하는데 인자로 subscriber 대신 consumer 함수를 보낼 수 있다. consumer 함수는 onNext() 이벤트가 실행 되었을 때 동작하는 함수이다.
- 리액터는 각 단계에서 데이터를 처리하기 위해 operator 개념을 추가한다. operator 를 사용하면 결과로 새로운 중간 publisher 가 반환된다.   

   ```java
   Flux<String> flux1 = Flux.just("A");
   // operator
   Flux<String> flux2 = flux1.map(d -> "foo" + d);
   flux2.subscribe(System.out.println);
   ```