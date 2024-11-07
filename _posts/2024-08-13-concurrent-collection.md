---
layout: post
title: Java 스레드6 - 동시성 컬렉션
date: 2024-08-14 01:00:00 + 0900
categories: Java
ref: Java, thread, multi-thread, concurrent, collection
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 11. 동시성 컬렉션

우리가 일반적으로 자주 사용하는 ArrayList, LinkedList, HashSet, HashMap 등 많은 자료 구조 대부분은 스레드 세이프 하지 않다.    
그리고 자료 구조들이 제공하는 add() 와 같은 연산은 원자적으로 보이지만 그렇지 않다.    
연산 내부에서는 배열에 데이터를 추가하고, 사이즈를 변경하고, 배열을 새로 만들어서 배열의 크기도 늘리는 등 여러 연산이 함께 사용된다.   
따라서 멀티스레드 상황에서 java.util 패키지가 제공하는 일반적인 컬렉션들을 사용하면 안된다.   
   
## 11-1. 자바 동시성 컬렉션1 - synchronized

일반적인 자료 구조를 스레드 세이프하게 사용하기 위해 자료 구조의 연산에 synchronized를 붙여 동기화 하는 방법이 있다.   


```java
public class SynchronizedListMain {

    public static void main(String[] args) throws InterruptedException {
        List<String> list= Collections.synchronizedList(new ArrayList<>());
        test(list);
    }

    public static void test(List list) throws InterruptedException {
        log(list.getClass().getSimpleName());

        Runnable addA = new Runnable() {
            @Override
            public void run() {
                list.add("A");
                log("Thread-1: list.add(A)");
            }
        };

        Runnable addB = new Runnable() {
            @Override
            public void run() {
                list.add("B");
                log("Thread-2: list.add(B)");
            }
        };

        Thread thread1 = new Thread(addA, "Thread-1");
        Thread thread2 = new Thread(addB, "Thread-2");
        thread1.start();
        thread2.start();
        thread1.join();
        thread2.join();
        log(list);
    }
}
```
   
Collections.synchronizedList()는 내부적으로 프록시 패턴을 사용해 다음과 같이 자료 구조의 연산을 래핑하고 synchronized를 추가해 실행 되도록 개발되어 있다.   

```java
public interface SimpleList {
    int size();
    void add(Object e);
    Object get(int index);
}

public class SyncProxyList implements SimpleList {

    private SimpleList target;

    public SyncProxyList(SimpleList target) {
        this.target = target;
    }

    @Override
    public synchronized int size() {
        return target.size();
    }

    @Override
    public synchronized void add(Object e) {
        target.add(e);
    }

    @Override
    public synchronized Object get(int index) {
        return target.get(index);
    }
}
```
   
#### synchronized 프록시 방식의 단점

synchornized 프록시를 사용하는 방식은 다음과 같은 단점이 있다.
- 첫째, 동기화 오버헤드가 발생한다. 자료 구조의 각 메서드 호출 시 마다 동기화 비용이 추가되어 성능 저하가 발생할 수 있다.
- 둘째, 전체 컬렉션에 대해 동기화가 이뤄지기 때문에 잠금 범위가 넓어진다. 이는 잠금 경합을 증가시켜 병렬 처리의 효율성을 저하시킨다.
- 셋째, Lock, ReentrantLock, CAS 등을 활용한 정교한 동기화가 불가능하다.
   
## 11-2. 자바 동시성 컬렉션2 - 동시성 컬렉션

자바는 synchronized 프록시 방식의 단점을 보완하기 위해 java.util.concurrent 패키지에 동시성 컬렉션을 제공한다.   
synchronized, Lock(ReentrantLock), CAS, 분할 잠금 기술 등 다양한 방법을 섞어서 매우 정교한 동기화를 통해 성능을 최적화 했다.   
   
#### 동시성 컬렉션의 종류

- List
  - CopyOnWriteArray: ArrayList의 대안
- Set
  - CopyOnWriteArraySet: HasSet의 대안
  - ConcurrentSkipListSet: TreeSet의 대안
- Map
  - ConcurrentHashMap: HashMap의 대안
  - ConcurrentSkipListMap: TreeMap의 대안
- Queue
  - ConcurrentLinkedQueue: 동시성 큐, non-blocking 큐
- Deque
  - ConcurrentLinkedDeque: 동시성 데크, non-blocking 큐
   
#### 스레드를 차단하는 블로킹 큐

- BlockingQueue
  - ArrayBlockingQueue
    - 크기가 고정된 블로킹 큐
    - fair 모드를 사용할 수 있다. fair 모드를 사용하면 성능이 저하될 수 있다.
  - LinkedBlockingQueue
    - 크기가 무한하거나 고정된 블로킹 큐
  - PriorityBlockingQueue
    - 우선순위가 높은 요소를 먼저 처리하는 블로킹 큐
  - SynchoronousQueue
    - 데이터를 저장하지 않는 블로킹 큐로, 생산자가 데이터를 추가하면 소비자가 그 데이터를 받을 때 까지 대기한다. 생산자-소비자 간에 중간 큐 없이 직접 거래하는 핸드오프 메커니즘을 제공한다.
  - DelayQueue
    - 지연된 요소를 처리하는 블로킹 큐로 각 요소는 지정된 지연 시간이 지난 후에야 소비될 수 있다.
    - 일정 시간이 지난 후 작업을 처리해야 하는 스케줄링 작업에 사용된다.
