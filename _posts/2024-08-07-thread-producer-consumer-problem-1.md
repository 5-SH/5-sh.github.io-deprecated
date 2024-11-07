---
layout: post
title: Java 스레드3 - 생산자 소비자 문제 1
date: 2024-08-07 01:00:00 + 0900
categories: Java
ref: Java, thread, multi-thread, producer, consumer
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 8. 생산자 소비자 문제

멀티스레드 프로그래밍에서 자주 등장하는 동시성 문제 중 하나로, 여러 스레드가 동시에 데이터를 생산하고 소비하는 상황을 다룬다.    
<br/>

- 생산자(Producer): 데이터를 생성하는 역할을 한다.
- 소비자(Consumer): 데이터를 사용하는 역할을 한다.
- 버퍼(Buffer): 생산자가 생성한 데이터를 일시적으로 저장하는 공간이다. 이 버퍼는 한정된 크기를 가지고 생산자가 소비자가 이 버퍼를 통해 데이터를 주고 받는다.

<br/>

문제상황
- 생산자가 너무 빠를 때: 버퍼가 가득 차서 더 이상 데이터를 넣을 수 없을 때까지 생산자가 데이터를 생성한다. 버퍼가 가득 찬 경우 생산자는 버퍼에 빈 공간이 생길 때까지 기다려야 한다.
- 소비자가 너무 빠를 때: 버퍼가 비어서 더이상 소비할 데이터가 없을 때까지 소비자가 데이터를 처리한다. 버퍼가 비어있을 때 소비자는 버퍼에 새로운 데이터가 들어올 때까지 기다려야 한다.

## 8-1. Object - wait, notify

자바는 처음부터 멀티스레드를 고려하여 탄생한 언어이다.   
synchronized를 사용한 임계 영역 안에서 락을 가지고 무한 대기하는 문제는 Object 클래스에 해결 방안이 있다.    
Object 클래스는 이런 문제를 해결할 수 있는 wait(), notify() 라는 메서드를 제공한다.    

<br/>

- Object.wait()
  - 현재 스레드가 가진 락을 반납하고 대기(WAITING) 한다.
  - 현재 스레드를 대기(WAITING) 상태로 전환한다. 이 메서드는 현재 스레드가 synchronized 블록이나 메서드에서 락을 소유하고 있을 때만 호출할 수 있다. 호출한 스레드는 락을 반납하고 다른 스레드가 락을 획득할 수 있도록 한다. 이렇게 대기 상태로 전환된 스레드는 다른 스레드가 notify() 또는 notifyAll()을 호출할 때까지 대기 상태를 유지한다.
- Object.notify()
  - 대기 중인 스레드 중 하나를 깨운다.
  - 이 메서드는 synchronized 블록이나 메서드에서 호출되어야 한다. 깨운 스레드는 락을 다시 획득할 기회를 얻게 된다. 만약 대기 중인 스레드가 여러 개라면, 그 중 하나만 깨워진다.
- Object.notifyAll()
  - 대기 중인 모든 스레드를 깨운다.
  - synchronized 블록이나 메서드에서 호출되어야 하며 모든 대기 중인 스레드가 락을 획득할 수 있는 기회를 얻게 된다.

```java
public interface BoundedQueue {
    void put(String data);

    String take();
}

public class BoundedQueueV3 implements BoundedQueue {

    private final Queue<String> queue = new ArrayDeque<>();
    private final int max;

    public BoundedQueueV3(int max) {
        this.max = max;
    }

    @Override
    public synchronized void put(String data) {
        while (queue.size() == max) {
            log("[put] 큐가 가득 참, 생산자 대기");
            try {
                wait();
                log("[put] 생산자 깨어남");
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }
        queue.offer(data);
        log("[put] 생산자 데이터 저장, notify() 호출");
        notify();
//        notifyAll();
    }

    @Override
    public synchronized String take() {
        while (queue.isEmpty()) {
            log("[take] 큐에 데이터가 없음, 소비자 대기");
            try {
                wait();
                log("[take] 소비자 깨어남");
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }
        String data = queue.poll();
        log("[take] 소비자 데이터 획득, notify() 호출");
        notify();
//        notifyAll();
        return data;
    }

    @Override
    public String toString() {
        return queue.toString();
    }
}

public class ConsumerTask implements Runnable {

    private BoundedQueue queue;

    public ConsumerTask(BoundedQueue queue) {
        this.queue = queue;
    }

    @Override
    public void run() {
        log("[소비 시도]     ? <- " + queue);
        String data = queue.take();
        log("[소비 완료] " + data + " <- " + queue);
    }
}

public class ProducerTask implements Runnable {

    private BoundedQueue queue;
    private String request;

    public ProducerTask(BoundedQueue queue, String request) {
        this.queue = queue;
        this.request = request;
    }

    @Override
    public void run() {
        log("[생산 시도] " + request + " -> " + queue);
        queue.put(request);
        log("[생산 완료] " + request + " -> " + queue);
    }
}

public class BoundedMain {

    public static void main(String[] args) {
        BoundedQueue queue = new BoundedQueueV3(2);

//        producerFirst(queue);
        consumerFirst(queue);
    }

    private static void producerFirst(BoundedQueue queue) {
        log("== [생산자 먼저 실행] 시작, " + queue.getClass().getSimpleName() + "==");
        List<Thread> threads = new ArrayList<>();
        startProducer(queue, threads);
        printAllState(queue, threads);
        startConsumer(queue, threads);
        printAllState(queue, threads);
        log("== [생산자 먼저 실행] 종료, " + queue.getClass().getSimpleName() + "==");
    }

    private static void consumerFirst(BoundedQueue queue) {
        log("== [소비자 먼저 실행] 시작, " + queue.getClass().getSimpleName() + "==");
        List<Thread> threads = new ArrayList<>();
        startConsumer(queue, threads);
        printAllState(queue, threads);
        startProducer(queue, threads);
        printAllState(queue, threads);
        log("== [소비자 먼저 실행] 종료, " + queue.getClass().getSimpleName() + "==");
    }

    private static void startProducer(BoundedQueue queue, List<Thread> threads) {
        System.out.println();
        log("생산자 시작");
        for (int i = 1; i <= 3; i++) {
            Thread producer = new Thread(new ProducerTask(queue, "data" + i), "producer" + i);
            threads.add(producer);
            producer.start();
            sleep(100);
        }
    }

    private static void startConsumer(BoundedQueue queue, List<Thread> threads) {
        System.out.println();
        log("소비자 시작");
        for (int i = 1; i <= 3; i++) {
            Thread consumer = new Thread(new ConsumerTask(queue), "consumer" + i);
            threads.add(consumer);
            consumer.start();
            sleep(100);
        }
    }

    private static void printAllState(BoundedQueue queue, List<Thread> threads) {
        System.out.println();
        log("현재 상태 출력, 큐 데이터: " + queue);
        for (Thread thread : threads) {
            log(thread.getName() + ": " + thread.getState());
        }
    }
}
```
![KakaoTalk_20240809_120508874](https://github.com/user-attachments/assets/3405421b-b45a-4166-a374-846e670f0b9d)

put(data) - wait(), notify()
- synchronized를 통해 임계 영역을 설정한다. 생산자 스레드는 락 획득을 시도한다.
- 락을 획득한 생산자 스레드는 반복문을 사용해서 큐에 빈 공간이 생기는지 주기적으로 체크한다. 만약 빈 공간이 없다면 Object.wait()를 사용해서 락을 반납하고 대기한다. 그리고 대기 상태에서 깨어나면 다시 반복문에서 큐의 빈 공간을 체크한다.
- wait()를 호출해서 대기하는 경우 RUNNABLE → WAITING 상태가 된다.
- 생산자가 데이터를 큐에 저장하고 나면 notify() 를 통해 저장된 데이터가 있다고 대기하는 스레드에 알려줘야 한다.

<br/>

take() - wait(), notify()
- synchronized를 통해 임계 영역을 설정한다. 소비자 스레드는 락 획득을 시도한다.
- 락을 획득한 소비자 스레드는 반목문을 사용해서 큐에 데이터가 있는지 주기적으로 체크한다. 데이터가 없다면 Object.wait()를 사용해서 락을 반납하고 대기한다. 그리고 대기상태에서 깨어나면 반복문에서 큐에 데이터가 있는지 체크한다.
- 대기하는 경우 RUNNABLE → WAITING 상태가 된다.
- 소비자가 데이터를 획득하고 나면 notify()를 통해 큐에 저장할 여유 공간이 생겼다고, 대기하는 스레드에게 알려줘야 한다.

<br/>

※ wait()로 락을 반납하고 대기 상태에 빠진 스레드는 notify()를 사용해야 깨울 수 있다.

#### 스레드 대기 집합(wait set)

- synchronized 임계 영역 안에서 Object.wait()를 호출하면 스레드는 대기(WAITING) 상태에 들어간다. 
- 이렇게 대기 상태에 들어간 스레드를 관리하는 것을 대기 집합이라 한다. 
- 모든 객체는 각자의 대기 집합을 갖고 있다.
- notify() 를 통해 스레드 대기 집합에서 깨어나는 스레드는 임계 영역에 있으므로 바로 실행되지 않고 락을 획득하기 위해 BLOCKED 상태로 대기한다. 락을 얻으면 BLOCKED → RUNNABLE 상태로 변경되고 wait() 이후의 코드를 실행한다.

## 8-2. wait, notify 의 한계

Object.wait(), Object.notify() 방식은 스레드 대기 집합 하나에 생산자, 소비자 스레드를 모두 관리한다.     
그리고 notify() 를 호출할 때 임의의 스레드가 선택된다. 따라서 큐에 데이터가 없는 상황에 소비자가 같은 소비자를 깨우는 비효율이 발생할 수 있다.   
또는 큐에 데이터가 가득 차있는데 생산자가 같은 생산자를 깨우는 **비효율**도 발생할 수 있다.   

<br/>

또 다른 문제점으로 **스레드 기아 문제**가 있다.   
notify() 는 어떤 스레드를 깨울지 알 수 없어서 큐에 소비할 데이터가 없는데 스레드 대기 집합에서 소비자 스레드만 계속 깨울 수 있다.    
스레드 대기 집합의 생산자 스레드는 실행 순서를 얻지 못하다가 아주 나중에 깨어날 수 있다.    
이렇게 대기 상태의 스레드가 실행 순서를 계속 얻지 못해서 실행되지 않는 상황을 스레드 기아 상태라 한다.   
이 문제를 해결하기 위해 notify() 대신에 notifyAll() 을 사용한다.   

<br/>

notifyAll() 을 사용하면 스레드 대기 집합에 있는 모든 스레드를 한 번에 다 깨운다.    
큐에 소비할 데이터가 없고 스레드 대기 집합에 여러 소비자, 생산자 스레드가 있을 때 notifyAll() 이 호출되면    
스레드 대기 집합의 모든 스레드가 깨워지고 소비자 스레드는 BLOCKED 상태에서 락을 얻더라도 큐에 소비할 데이터가 없어 다시 스레드 대기 집합에 들어간다.    
그리고 나중에라도 생산자 스레드가 호출되고 락을 얻어 큐에 데이터를 추가하게 된다.    
notifyAll() 을 사용해서 스레드 기아 문제는 막을 수 있지만 비효율을 막지는 못한다.
