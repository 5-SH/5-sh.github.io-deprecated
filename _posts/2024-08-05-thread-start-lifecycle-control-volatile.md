---
layout: post
title: Java 스레드1 - 생성, 생명주기, 제어, 메모리 가시성
date: 2024-08-05 15:30:00 + 0900
categories: Java
ref: Java, thread, multi-thread
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 1. 스레드 생성
스레드는 Thread 클래스를 상속 받거나 Runnable 인터페이스를 구현해 만들 수 있다.    
다른 클래스나 인터페이스를 상속 받을 수 있고 스레드와 실행할 작업을 분리하고 여러 스레드에서 Runnable 을 재사용하기 위해 보통 Runnable 인터페이스를 구현해 만든다.    

```java
Thread thread = new Thread(new Runnable() {
    @Override
    public void run() {
        log("run()");
    }

thread.start();
```

# 2. 스레드 생명 주기

스레드는 생성하고 시작하고, 종료되는 생명 주기를 가집니다.

**NEW** → **Runnable**(**Blocked**, **Wating**, **Timed Waiting**) → **Terminated**

- New : 스레드가 생성 되었으나 아직 시작되지 않은 상태.
  - Thread.thread = new Thread(runnable);
- Runnable : 스레드가 실행 중이거나 실행 가능한 상태.
  - thread.start();
  - OS 스케줄러 실행 대기열에 있거나 CPU 에서 실행 중인 상태.
- Blocked : 스레드가 동기화 락을 기다리는 상태.
  - synchronized 블록에 진입하기 위해 락을 얻어야 하는 경우.
- Waiting : 스레드가 무기한으로 다른 스레드의 작업을 기다리는 상태.
  - object.wait()
  - wait(), join() 메서드가 호출 될 때 이 상태가 된다.
  - 다른 스레드가 notify() 또는 notifyAll() 메서드를 호출하거나, join() 이 완료될 때 까지 기다린다.
- Timed Watiting : 스레드가 일정 시간 동안 다른 스레드의 작업을 기다리는 상태.
  - sleep(long millis), wait(long timeout), join(long mills)
  - 주어진 시간이 경과하거나 다른 스레드가 해당 스레드를 깨우면 벗어난다.
- Terminated : 스레드의 실행이 완료된 상태.
  - 스레드가 정상적으로 종료되거나, 예외가 발생해 종료된 경우.
  - 스레드는 한 번 종료되면 다시 시장할 수 없다.

```java
package thread.control;

import static thread.util.MyLogger.log;

public class ThreadStateMain {

    public static void main(String[] args) throws InterruptedException {
        Thread thread = new Thread(new MyRunnable(), "myThread");
        log("myThread.state1 = " + thread.getState());
        log("myThread.start()");
        thread.start();
        Thread.sleep(1000);
        log("myThread.state3 = " + thread.getState());
        Thread.sleep(4000);
        log("myThread.state5 = " + thread.getState());
        log("end");
    }

    static class MyRunnable implements Runnable {
        @Override
        public void run() {
            try {
                log("start");
                log("myThread.state2 = " + Thread.currentThread().getState());
                log("sleep() start");
                Thread.sleep(3000);
                log("sleep() end");
                log("myThread.state4 = " + Thread.currentThread().getState());
                log("end");
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
```

# 3. 스레드 제어1

## 3-1. Runnable의 체크 예외

Runnable 인터페이스는 InterruptedException 체크 예외를 밖으로 던질 수 없다.

```java
public interface Runnable {
    void run();
}
```

자바는 메서드에서 지켜야할 예외와 관련된 규칙이 있다.
- 체크 예외
  - 부모 메서드가 체크 예외를 던지지 않는 경우 재정의된 자식 메서드도 체크 예외를 던질 수 없다.
  - 자식 메서드는 부모 메서드가 던질 수 있는 체크 예외의 하위 타입만 던질 수 있다.
- 런타임(언체크) 예외
  - 예외 처리를 강제하지 않으므로 상관없이 던질 수 있다.

Runnable 인터페이스의 run() 메서드는 체크 예외를 던지지 않기 때문에 메서드를 재정의 하는 곳에서 밖으로 던질 수 없다.   

체크 예외를 run() 메서드에서 던질 수 없고 try-catch 블록 내에서 처리 하도록 강제한다.   
예외 발생 시 예외가 처리되지 않아 프로그램이 비정상 종료되는 상황을 방지할 수 있다.    
하지만 체크 예외를 강제하는 것은 자바 초장기 기조이고 최근에는 체크 예외보다 런타임 예외를 선호한다.

## 3-2. join()

특정 스레드가 완료될 때 까지 기다려야 하는 상황이면 join()을 사용한다.    

join() 을 호출하는 스레드는 대상 스레드가 TERMINATED 상태가 될 때 까지 대기한다.    
대상 스레드가 TERMINATED 상태가 되면 호출 스레드는 다시 RUNNABLE 상태가 되면서 다음 코드를 수행한다.   

join() 은 다른 스레드가 완료될 때 까지 무기한 기다리는 단점이 있는데,    
join(ms) 를 호출하면 특정 시간 만큼만 대기한다. 호출 스레드는 지정한 시간이 지나면 다시 RUNNABLE 상태가 되어 다음 코드를 수행한다.

```java
public class JoinMain {

    public static void main(String[] args) throws InterruptedException {
        log("Start");
        SumTask task1 = new SumTask(1, 50);
        SumTask task2 = new SumTask(51, 100);
        Thread thread1 = new Thread(task1, "thread-1");
        Thread thread2 = new Thread(task2, "thread-2");

        thread1.start();
        thread2.start();

        log("join() - main 스레드가 thread1, thread2 종료까지 대기");
        thread1.join();
        thread2.join();
        log("main 스레드 대기 완료");

        log("task1.result = " + task1.result);
        log("task2.result = " + task2.result);

        int sumAll = task1.result + task2.result;
        log("task1 + task2 = " + sumAll);
        log("End");
    }

    static class SumTask implements Runnable {

        int startValue;
        int endValue;
        int result = 0;

        public SumTask(int startValue, int endValue) {
            this.startValue = startValue;
            this.endValue = endValue;
        }

        @Override
        public void run() {
            log("작업 시작");

            sleep(2000);

            int sum = 0;
            for (int i = startValue; i <= endValue; i++) {
                sum += i;
            }
            result = sum;

            log("작업 완료 result = " + result);
        }
    }
}
```

# 4. 스레드 제어2

## 4-1. 인터럽트

인터럽트를 사용하면 WAITING, TIMED_WAITING 같은 대기 상태의 스레드를 직접 깨워서, RUNNABLE 상태로 만들 수 있다.   

자바는 인터럽트 예외가 한 번 발생하면, 스레드의 인터럽트 상태를 다시 정상(false)으로 돌린다.       
스레드의 인터럽트 상태를 정상으로 돌리지 않으면 이후에도 계속 인터럽트가 발생하게 된다.   
인터럽트의 목적을 달성하면 인터럽트 상태를 다시 정상으로 돌려두어야 한다.   

스레드의 인터럽트 상태를 단순히 확인만 하는 용도라면 Thread.isInterrupted()를 사용한다.
하지만 직접 체크해서 사용할 때는 Thread.interrupted()를 사용한다.
interrupted() 는 인터럽트 상태라면 true 를 반환하고 해당 스레드의 인터럽트 상태를 false 로 변경한다.   
인터럽트 상태가 아니면 false 를 반환하고 해당 스레드의 인터럽트의 상태를 바꾸지 않는다.   

```java
public class ThreadStopMain {

    public static void main(String[] args) {
        MyTask task = new MyTask();
        Thread thread = new Thread(task, "work");
        thread.start();

        sleep(100);
        log("작업 중단 지시 - thread.interrupt()");
        thread.interrupt();
        log("work 스레드 인터럽트 상태1 = " + thread.isInterrupted());
    }

    static class MyTask implements Runnable {

        @Override
        public void run() {
            while (!Thread.interrupted()) {
                log("작업 중");
            }
            log("work 스레드 인터럽트 상태2 = " + Thread.currentThread().isInterrupted());

            try {
                log("자원 정리 시도");
                Thread.sleep(1000);
                log("자원 정리 완료");
            } catch (InterruptedException e) {
                log("자원 정리 실패 - 자원 정리 중 인터럽트 발생");
                log("work 스레드 인터럽트 상태3 = " + Thread.currentThread().isInterrupted());
            }
            log("작업 종료");
        }
    }
}
```

## 4-2. yield

어떤 스레드를 얼마나 실행할지는 운영체제가 스케줄링을 통해 결정한다.    
특정 스레드가 크게 바쁘지 않은 상황에서 다른 스레드에 CPU 실행 기회를 양보할 때 yield 를 사용한다.   

RUNNABLE 상태일 때 스레드가 CPU에서 실제로 실행 중인 Running 상태와 스케줄링 큐에서 대기 중인 Ready 상태일 수 있다.   
Thread.yield() 를 사용하면 호출한 스레드는 RUNNABLE 상태를 유지하면서 CPU 를 양보한다.

```java
public class YieldMain {

    static final int THREAD_COUNT = 1000;

    public static void main(String[] args) {
        for (int i = 0; i < THREAD_COUNT; i++) {
            Thread thread = new Thread(new MyRunnable());
            thread.start();
        }
    }

    static class MyRunnable implements Runnable {

        @Override
        public void run() {
            for (int i = 0; i < 10; i++)
                System.out.println(Thread.currentThread().getName() + " - " + i);

            // sleep(1); // RUNNABLE → TIMED_WAITING → RUNNABLE
            Thread.yield();
        }
    }
}
```

# 5. 메모리 가시성

멀티스레드 환경에서 한 스레드가 변경한 값이 다른 스레드에서 언제 보이는지에 대한 것을 메모리 가시성이라고 한다.    

main 스레드와 work 스레드가 heap 영역에 있는 변수를 동시에 참조할 때, heap 메모리에 선언된 변수를 읽어 올 것이라 예상 하지만 실제 동작은 다르다.   
CPU 의 연산 속도에 비해 메모리의 연산 속도는 매우 느리다. CPU 의 연산 속도를 따라가기 위해 CPU 는 코어 단위로 캐시 메모리를 가진다.    
캐시 메모리를 메인 메모리에 반영하거나 메인 메모리 변경을 캐시 메모리에 다시 불러오는 것은 주로 컨텍스트 스위칭이 될 때 이지만, CPU 설계 방식과 실행 환경에 따라 다를 수 있다.    
따라서 아래 예시에서 main 스레드가 runFlag를 false로 바꿔도 work 스레드는 중단되지 않는다.

runFlag 변수에 volatile 을 붙이면 캐시 메모리를 활용한 성능의 이점을 포기하고 heap 메모리에 있는 값을 참조한다.    
이 경우에 main 스레드가 runFlag를 false로 바꾸면 캐시 메모리가 아닌 heap 메모리의 runFlag 값이 바뀌고 work 스레드도 heap 메모리의 runFlag 값이 false 로 바뀐 것을 확인하고 중단되게 된다.

```java
public class VolatileFlagMain {
     public static void main(String[] args) {
        MyTask task = new MyTask();
        Thread t = new Thread(task, "work");
        log("runFlag = " + task.runFlag);
        t.start();
 
        sleep(1000);
        log("runFlag를 false로 변경 시도");
        task.runFlag = false;
        log("runFlag = " + task.runFlag);
        log("main 종료");
    }

    static class MyTask implements Runnable {
        boolean runFlag = true;
        //volatile boolean runFlag = true;
        
        @Override
        public void run() {
            log("task 시작");
            while (runFlag) {
                // runFlag가 false로 변하면 탈출
            }
            log("task 종료");
        }
    }
}
```

volatile 이 있을 때와 없을 때에 약 5배의 성능 차이가 난다.    
아래 코드를 실행하면 volatile 이 없을 때 count 값이 611296934 에서 flag 값이 false 가 되고.
volatile 이 있을 때 count 값이 144193052 에서 flag 값이 false 가 된다.    

```java
public class VolatileCountMain {

    public static void main(String[] args) {
        MyTask task = new MyTask();
        Thread t = new Thread(task, "work");
        t.start();

        sleep(1000);

        task.flag = false;
        log("flag = " + task.flag + ", count = " + task.count + " in main");
    }

    static class MyTask implements Runnable {
//         boolean flag = true;
//         long count;

         volatile boolean flag = true;
         volatile long count;


        @Override
        public void run() {
            while (flag) {
                count++;
                if (count % 100_000_000 == 0) {
                    log("flag = " + flag + ", count = " + count + " in while()");
                }
            }
            log("flag = " + flag + ", count = " + count + " 종료");
        }
    }
}
```