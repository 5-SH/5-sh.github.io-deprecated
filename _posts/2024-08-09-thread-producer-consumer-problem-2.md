---
layout: post
title: Java 스레드4 - 생산자 소비자 문제 2
date: 2024-08-09 01:00:00 + 0900
categories: Java
ref: Java, thread, multi-thread, producer, consumer
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 9. 생산자 소비자 문제

생산자가 생산자를 깨우고, 소비자가 소비자를 꺠우는 비효율 문제를 어떻게 해결할 수 있을까?   
생산자 스레드는 데이터를 생성하고 스레드 대기 집합에서 대기 중인 소비자 스레드를 깨워야 한다.    
반대로 소비자 스레드는 데이터를 소비하고 스레드 대기 집합에서 대기 중인 생산자 스레드를 깨워야 한다.    
생산자 스레드가 대기하는 대기 집합과 소비자 스레드가 대기하는 대기 집합을 둘로 나누고     
생산자 스레드는 소비자 스레드 대기 집합에서 소비자 스레드를 깨우고 소비자 스레드는 생산자 스레드 대기 집합에서 생산자 스레드를 깨우면 된다.    
Lock 과 ReentrantLock 을 사용해 구현할 수 있다.   
synchronized, Object.wait(), Object.notify() 를 Lock 인터페이스와 ReentrantLock 구현체를 사용해 다시 개발한다.   

```java
public class BoundedQueueV5 implements BoundedQueue {

    private final Lock lock = new ReentrantLock();
    private final Condition producerCond = lock.newCondition();
    private final Condition consumerCond = lock.newCondition();

    private Queue<String> queue = new ArrayDeque<>();
    private final int max;

    public BoundedQueueV5(int max) {
        this.max = max;
    }

    @Override
    public void put(String data) {
        lock.lock();
        try {
            while (queue.size() == max) {
                log("[put] 큐가 가득 참, 생산자 대기");
                producerCond.await();
                log("[put] 생산자 깨어남");
            }
            queue.offer(data);
            log("[put] 생산자 데이터 저장, consumerCond.signal() 호출");
            consumerCond.signal();
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public String take() {
        lock.lock();
        try {
            while (queue.isEmpty()) {
                log("[take] 큐에 데이터가 없음, 소비자 대기");
                consumerCond.await();
                log("[take] 소비자 깨어남");
            }
            String data = queue.poll();
            log("[take] 소비자 데이터 획득, producerCond.signal() 호출");
            producerCond.signal();
            return data;
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public String toString() {
        return queue.toString();
    }
}
```

**Condition**    

Condition은 ReentrantLock을 사용하는 스레드가 대기하는 스레드 대기 공간이다.    
lock.newCondition() 메서드를 호출하면 Lock(ReentrantLock)의 스레드 대기 공간이 만들어 진다.    
Object.wait() 에서 사용한 스레드 대기 공간은 모든 객체 인스턴스가 내부에 기본으로 가지고 있는 것 이지만,    
Lock(ReentrantLock)은 별도의 스레드 대기 공간을 직접 만들어 사용한다.    
   
**condition.await()**    

Object.wait() 와 유사한 기능이다. 지정한 condition에 현재 스레드를 대기(WAITING) 상태로 보관한다.   
이 때 ReentrantLock 에서 획득한 락을 반납하고 대기 상태로 condition 에 보관된다.   
   
**condition.signal()**    

Object.nofity() 와 유사한 기능이다. 지정한 condition 에서 대기 중인 스레드를 하나 깨운다. 깨어난 스레드는 condition 에서 빠져나온다.    

**Condition 분리**
- consumerCond: 생산자를 위한 스레드 대기 공간
- producerCond: 소비자를 위한 스레드 대기 공간

**put(data) - 생산자 스레드가 호출**
- 큐가 가득 찬 경우: producerCond.await()를 호출해서 생산자 스레드를 생산자 전용 스레드 대기 공간에 보관한다.
- 데이터를 저장한 경우: 데이터를 큐에 추가하고 consumerCond.signal()을 호출해서 소비자 전용 스레드 대기 공간에 신호를 보내 소비자 스레드를 깨운다.

**take() - 소비자 스레드가 호출**
- 큐가 빈 경우: consumerCond.await()를 호출해서 소비자 스레드를 소비자 전용 스레드 대기 공간에 보관한다.
- 데이터를 소비한 경우: 소비자가 데이터를 소비하고 producerCond.signal()을 호출해서 생산자 전용 스레드 대기 공간에 신호를 보내 생산자 스레드를 깨운다.

## 9-1. 스레드의 대기

synchronized 대기와 ReentrantLock 의 대기는 같은 방식으로 동작하지만 약간의 차이가 있다.   

**synchonized 대기**
- 대기1: 락 획득 대기
  - BLOCKED 상태로 락 획득 대기
  - synchronized를 시작할 때 락이 없으면 대기
  - 다른 스레드가 synchronized를 빠져나갈 때 대기가 풀리며 락 획득 시도
- 대기2: wait() 대기
  - WAITING 상태로 대기
  - wait()를 호출 했을 때 스레드 대기 집합에서 대기
  - 다른 스레드가 notify()를 호출 했을 때 빠져나감

개념삼 락 대기 집합이 1차 대기소이고 스레드 대기 집합이 2차 대기소이다.   
소비자/생산자가 너무 빠를 때 발생하는 문제 상황을 해결하기 위해 2차 대기소에 있는 스레드가 빠져 나오면,    
임계 영역에서 한 번에 한 스레드만 동작하기 위해 1차 대기소에서 락을 얻을 때까지 기다려야 한다.   
스레드는 2중 대기소를 모두 탈출해야 임계 영역을 수행할 수 있다.    

자바의 모든 객체 인스턴스는 멀티스레드와 임계 영역을 다루기 위해 3가지 기본 요소를 가진다.   
- 모니터 락
- 락 대기 집합(모니터 락 대기 집합) - 1차 대기소
- 스레드 대기 집합 - 2차 대기소

3가지 요소는 서로 맞물려 돌아간다.
- synchronized를 사용한 임계 영역에 들어가려면 모니터 락이 필요하다.
- 모니터 락이 없으면 락 대기 집합에 들어가서 BLOCKED 상태로 락을 기다린다.
- 모니터 락을 반납하면 락 대기 집합에 있는 스레드 중 하나가 락을 획득하고 BLCKED → RUNNABLE 상태가 된다.
- wait()를 호출해서 스레드 대기 집합에 들어가기 위해서는 모니터 락이 필요하다.
- 스레드 대기 집합에 등러가면서 모니터 락을 반납한다.
- 스레드가 notify()를 호출하면 스레드 대기 집합에 있는 스레드 중 하나가 스레드 대기 집합을 빠져나오고 모니터 락 획득을 시도한다. 
  - 모니터 락을 획득하면 임계 영역을 수행한다.
  - 모니터 락을 획득하지 못하면 락 대기 집엡에서 BLOCKED 상태로 락을 기다린다.

**synchronized vs ReentrantLock 대기**   
Lock(ReentrantLock)도 synchronized 처럼 2단계의 대기 상태가 존재한다.

- 대기1: ReentrantLock 락 획득 대기
  - ReentrantLock의 대기 큐에서 관리
  - WAITING 상태로 락 획득 대기
  - lock.lock()을 호출 했을 때 락이 없으면 대기
  - 다른 스레드가 lock.unlock()을 호출 했을 때 대기가 풀리며 락 획득을 시도하고 학을 획득하면 대기 큐를 빠져나감
- 대기2: await() 대기
  - condition.await()를 호출 했을 때, condition 객체의 스레드 대기 공간에서 관리
  - WAITING 상태로 대기
  - 다른 스레드가 condition.signal()을 호출 했을 때 condition 객체의 스레드 대기 공간에서 빠져나감

## 9-2. BlockingQueue
BoundedQueueV5은 같이 생산자 소비자 문제를 효율적으로 해결한 자료 구조이다.    
이 자료 구조는 큐의 기능을 넘어서 스레드를 효과적으로 제어하는 기능도 포함되어 있다.   
그리고 Java는 이런 역할을 하는 BlockingQueue 라는 자료 구조를 이미 만들어 놓았다.   

```java
public class BoundedQueueV6 implements BoundedQueue {

    private BlockingQueue<String> queue;

    public BoundedQueueV6(int max) {
        this.queue = new ArrayBlockingQueue<>(max);
    }

    @Override
    public String take() {
        try {
            return queue.take();
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void put(String data) {
        try {
            queue.put(data);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public String toString() {
        return queue.toString();
    }
}
```

## 9-2-1. 기능 설명

실무에서 멀티스레드를 사용할 때는 응답성이 중요하다.     
생산자가 무언가 데이터를 생산하는데, 버퍼가 빠지지 않아서 너무 오래 기다려야 한다면 무한정 기다리는 것 보다는    
작업을 포기하고 에러 메시지를 보내 다시 시도하도록 유도하는 것이 더 나은 선택일 것이다.   
   
큐가 가득 찼을 때 선택지는 4가지가 있다.
- 예외를 던지고 받아서 처리한다.
- 대기하지 않고 즉시 false를 반환한다.
- 대기한다.
- 특정 시간 만큼만 대기한다.   

이런 문제를 해결하기 위해 BlockingQueue 는 다양한 메서드를 제공한다.   

|Operation|Throws Exception|Special Value|Blocks|Times Out|
|---|---|---|---|---|
|Insert(추가)|add(e)|offer(e)|put(e)|offer(e, time, unit)|
|Remove(제거)|remove()|poll()|take()|poll(time, unit)|
|Examine(관찰)|element()|peek()|not applicable|not applicable|

**Throws Exception - 대기 시 예외**
- add(e): 지정된 요소를 큐에 추가하고 큐가 가득 차면 IllegalStateEception 예외를 던진다.
- remove(): 큐에서 요소를 제거하며 반환한다. 큐가 비어 있으면 NoSuchElementException 예외를 던진다.
- element(): 큐의 첫 번째 요소를 반환하지만 큐에서 제거하지 않는다. 큐가 비어 있으면 NoSuchElementException 예외를 던진다.
   
**Special Value - 대기 시 즉시 반환**
- offer(e): 지정된 요소를 큐에 추가하려고 시도하며, 큐가 가득 차면 false를 반환한다.
- poll(): 큐에서 요소를 제거하고 반환한다. 큐가 비어 있으면 null을 반환한다.
- peek(): 큐의 첫 번째 요소를 반환하지만 큐에서 제거하지 않는다. 큐가 비어 있으면 null을 반환한다.
   
**Block - 대기**
- put(e): 지정된 요소를 큐에 추가할 때 까지 대기한다. 큐가 가득 차면 공간이 생길 때까지 대기한다.
- take(): 큐에서 요소를 제거하고 반환한다. 큐가 비어 있으면 요소가 준비될 때까지 대기한다.
- Examine (관찰): 해당 사항 없음
   
**Times out - 시간 대기**
- offer(e, time, unit): 지정된 요소를 큐에 추가하려고 시도하고 지저된 시간 동안 큐가 비워지기를 기다리다 시간이 초과되면 false를 반환한다.
- poll(time, unit): 큐에서 요소를 제거하고 반환한다. 큐에 요소가 없다면 지정된 시간 동안 요소가 준비되길 기다리다 시간이 초과되면 null을 반환한다.
- Examine (관찰): 해당 사항 없음

```java
public class BoundedQueueV7 implements BoundedQueue {

    private BlockingQueue<String> queue;

    public BoundedQueueV7(int max) {
        this.queue = new ArrayBlockingQueue<>(max);
    }

    @Override
    public String take() {
        try {
            return queue.poll(2, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void put(String data) {
        try {
            // 동작 확인을 위해 1 나노초로 설정
            boolean result = queue.offer(data, 1, TimeUnit.NANOSECONDS);
            log("저장 시도 결과 = " + result);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public String toString() {
        return queue.toString();
    }
}
```