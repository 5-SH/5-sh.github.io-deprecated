---
layout: post
title: Java 스레드5 - CAS 동기화와 원자적 연산
date: 2024-08-12 01:00:00 + 0900
categories: [java]
tags: [java, thread, multi-thread, cas, spin lock]
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 10. CAS - 동기화와 원자적 연산

원자적 연산은 연산이 CPU에서 더 이상 나눌 수 없는 단위로 수행되는 것을 의미한다.    
따라서 멀티스레드 상황에서 다른 스레드의 간섭 없이 안전하게 처리될 수 있다.   

1씩 값을 증가하는 연산을 멀티스레드 환경에서 실행하면 여러 스레드가 동시에 실행해 예상하지 못한 값이 나올 수 있다.   
아래 코드를 실행하면 1,000이 나오지 않고 1,000 보다 작은 값이 나오는 것을 확인할 수 있다.    
스레드가 호출하는 value++ 가 원자적이지 않았기 때문이다.

```java
public interface IncrementInteger {

    void increment();

    int get();
}

public class BasicInteger implements IncrementInteger {

    private int value;

    @Override
    public int get() {
        return value;
    }

    @Override
    public void increment() {
        value++;
    }
}

public class IncrementThreadMain {

    public static final int THREAD_COUNT = 1000;

    public static void main(String[] args) throws InterruptedException {
        test(new BasicInteger());
    }

    private static void test(IncrementInteger incrementInteger) throws InterruptedException {
        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                sleep(10);
                incrementInteger.increment();
            }
        };

        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < THREAD_COUNT; i++) {
            Thread thread = new Thread(runnable);
            threads.add(thread);
            thread.start();
        }

        for (Thread thread : threads) {
            thread.join();
        }

        int result = incrementInteger.get();

        System.out.println(incrementInteger.getClass().getSimpleName() + " result: " + result);
    }
}
```

이 문제는 synchronized 키워드를 통해 해결할 수 있다.    
하지만 각각의 스레드들은 연산을 위해 락을 획득하려 시도하고 BLOCKED 상태로 기다리는 과정을 반복해야 한다.

```java
public class SyncInteger implements IncrementInteger {

    private int value;

    @Override
    public synchronized void increment() {
        value++;
    }

    @Override
    public int get() {
        return value;
    }
}
```

value의 값을 1 증가하는 연산을 원자적으로 수행하면 동기화를 하지 않고 이 문제를 해결할 수 있다.    
AtomicInteger는 멀티스레드 상황에서 안전하고 다양한 값 증가, 감소 연산을 제공한다.    

```java
public class MyAtomicInteger implements IncrementInteger {

    AtomicInteger atomicInteger = new AtomicInteger(0);

    @Override
    public void increment() {
        atomicInteger.incrementAndGet();
    }

    @Override
    public int get() {
        return atomicInteger.get();
    }
}
```

BasicInteger, SyncInteger, MyAtomicInteger의 실행 속도를 아래 코드로 비교 해보면,    
BasicInteger < MyAtomicInteger < SyncInteger 순서로 빠른 것을 알 수 있다.    
BasicInteger는 빠르지만 멀티스레드 상황에서 사용할 수 없고, 
SyncInteger는 멀티스레드 상황에서 사용할 수 있지만 락을 획득하고 기다리는 과정으로 인해      
AtomicInteger 보다 속도가 느린 것을 알 수 있다.    

```java
public class IncrementPerformanceMain {

    public static final long COUNT = 100_000_000;

    public static void main(String[] args) {
        test(new BasicInteger());
        test(new SyncInteger());
        test(new MyAtomicInteger());
    }

    private static void test(IncrementInteger incrementInteger) {
        long startMs = System.currentTimeMillis();
        for (long i = 0; i < COUNT; i++) {
            incrementInteger.increment();
        }
        long endMs = System.currentTimeMillis();
        System.out.println(incrementInteger.getClass().getSimpleName() + ": ms=" + (endMs - startMs));
    }
}

// 결과
// BasicInteger: ms=143
// SyncInteger: ms=1691
// MyAtomicInteger: ms=680
```

#### 락 기반 방식의 문제점

SyncInteger 클래스에서 데이터를 보호하기 위해 락(synchronized, Lock-ReentrantLock)을 사용한다.    
락을 사용하는 방식은 다음과 같이 작동한다.   
- 락이 있는지 확인한다.
- 락을 획득하고 임계 영역에 들어간다.
- 작업을 수행한다.
- 락을 반납한다.
100,000,000 번 락을 획득하고 반납하는 과정을 반복한다.    
   
#### CAS(Compare And Set)

이런 문제를 해결하기 위해 락을 걸지 않고 원자적인 연산을 수행할 수 있는데, 이것을 CAS 연산이라 한다.   
이 방법은 락을 사용하지 않기 때문에 lock-free 기법 이라고도 한다.   
CAS 연산은 락을 완전히 대체하는 것은 아니고 작은 단위의 일부 영역에 적용할 수 있다.   
   
AtomicInteger 의 incrementAndGet() 함수를 락 없이 CAS를 활용해 직접 구현해 보면 아래와 같다.    
락을 사용하진 않지만 다른 스레드가 값을 먼저 증가해서 문제가 발생하는 경우 루프를 돌며 재시도 하는 방식으로 동작한다.   
- 현재 변수의 값을 읽어온다.
- 변수의 값을 1 증가시킬 때, 원래 값이 같은지 확인한다.(CAS 연산 사용)
- 동일하다면 증가된 값을 변수에 저장하고 종료한다.
- 동일하지 않다면 다른 스레드가 값을 중간에 변경한 것이므로, 다시 처음으로 돌아가 위 과정을 반복한다.
   
스레드가 충돌할 때 마다 반복해서 다시 시도하므로, 락 없이 데이터를 안전하게 변경할 수 있다.    
CAS를 사용하는 방식은 충돌이 드물게 발생하는 환경에서는 락을 사용하지 않으므로 높은 성능을 발휘할 수 있다.   
그리고 스레드가 락을 획득하기 위해 대기하지 않기 때문에 대기 시간과 오버헤드가 줄어드는 장점이 있다.    
그러나 CAS는 자주 실패하고 재시도 하면서 CPU 자원을 소모하기 때문에 충돌이 빈번하게 발생하는 환경에서는 성능에 문제가 될 수 있다.    
   
```java
public class CasMain {

    private static final int THREAD_COUNT = 2;

    public static void main(String[] args) throws InterruptedException {
        AtomicInteger atomicInteger = new AtomicInteger(0);
        System.out.println("start value = " + atomicInteger.get());

        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                incrementAndGet(atomicInteger);
            }
        };
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < THREAD_COUNT; i++) {
            Thread thread = new Thread(runnable);
            threads.add(thread);
            thread.start();
        }

        for (Thread thread : threads) {
            thread.join();
        }

        int result = atomicInteger.get();
        System.out.println(atomicInteger.getClass().getSimpleName() + " resultValue: " + result);
    }

    private static int incrementAndGet(AtomicInteger atomicInteger) {
        int getValue;
        boolean result;
        do {
            getValue = atomicInteger.get();
            sleep(100); // 스레드 동시 실행을 위한 대기
            log("getValue: " + getValue);
            result = atomicInteger.compareAndSet(getValue, getValue + 1);
            log("result: " + result);
        } while(!result);

        return getValue + 1;
    }
}
```
    
#### CAS 락 구현
CAS는 단순한 연산 뿐만 아니라, 락을 구현하는데 사용할 수 있다.   

```java
public class SpinLock {
    private final AtomicBoolean lock = new AtomicBoolean(false);

    public void lock() {
        log("락 획득 시도");
        while (!lock.compareAndSet(false, true)) {
            log("락 획득 실패 - 스핀 대기");
        }
        log("락 획득 완료");
    }

    public void unlock() {
        lock.set(false);
        log("락 반납 완료");
    }
}

public class SpinLockMain {

    public static void main(String[] args) {
        SpinLock spinLock = new SpinLock();

        Runnable task = new Runnable() {
            @Override
            public void run() {
                spinLock.lock();
                try {
                    log("비즈니스 로직 실행");
                } finally {
                    spinLock.unlock();
                }
            }
        };

        Thread t1 = new Thread(task, "Thread-1");
        Thread t2 = new Thread(task, "Thread-2");

        t1.start();
        t2.start();
    }
}
```

CAS를 활용한 락(spin-lock)은 기다리는 스레드가 BLOCKED, WAITING 상태로 락을 획득할 때 까지 while 문을 반복하는 문제가 있는데, 락을 기다리는 스레드가 CPU를 계속 사용하면서 대기하는 것이다.    
따라서 임계 영역이 필요하지만 연산이 길지 않고 매우 짧게 끝날 때 사용해야 한다.    
숫자 값의 증가, 자료 구조의 데이터 추가와 같이 CPU 사이클이 금방 끝나는 연산에 사용하면 효과적이다.    
반면에 데이터베이스의 결과를 대기한다거나, 다른 서버의 요청을 기다린다거나 하는 것 처럼 오래 기다리는 작업에 사용하면 CPU를 계속 사용하며 기다리는 최악의 결과가 나올 수 있다.    
이 때는 동기화 락을 사용하는 것이 바람직하다.    

<br/>

실무 관점에서 보면 대부분의 애플리케이션들은 공유 자원을 사용할 때, 충돌할 가능성 보다 충돌하지 않을 가능성이 훨씬 높다.     
예를 들어 특정 시간에 주문이 100만건 들어오는 서비스라고 가정하면 1초에 277건이 들어온다.     
CPU가 1초에 얼마나 많은 연산을 처리하는지 생각해보면, 백만 건 중에 충돌이 나는 경우는 아주 넉넉하게 해도 몇 십 건 이하일 것이다.    
따라서 주문 수 증가와 같은 단순한 연산의 경우에는 동기화 락을 활용하는 것 보다 CAS를 사용하는 것이 더 나은 성능을 보인다.   