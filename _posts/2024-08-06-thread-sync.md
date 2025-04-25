---
layout: post
title: Java 스레드2 - 동시성
date: 2024-08-05 15:30:00 + 0900
categories: [java]
tags: [java, thread, multi-thread, sync]
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 6. 동기화

출금 예제 - 동시성 문제

```java
public interface BankAccount {

    boolean withdraw(int amount);

    int getBalance();
}

public class MyBankAccount implements BankAccount {

    private int balance;

    public MyBankAccount(int initialBalance) {
        this.balance = initialBalance;
    }

    @Override
    public synchronized boolean withdraw(int amount) {
        log("거래 시작: " + getClass().getSimpleName());

        log("[검증 시작] 출금액: " + amount + ", 잔액: " + balance);
        if (balance < amount) {
            log("[검증 실패] 출금액: " + amount + ", 잔액: " + balance);
            return false;
        }
        log("[검증 완료] 출금액: " + amount + ", 잔액: " + balance);
        sleep(1000);
        balance = balance - amount;
        log("[출금 완료] 출금액: " + amount + ", 변경 잔액: " + balance);

        log("거래 종료");
        return true;
    }

    @Override
    public synchronized int getBalance() {
        return balance;
    }
}

public class WithdrawTask implements Runnable {

    private BankAccount account;
    private int amount;

    public WithdrawTask(BankAccount account, int amount) {
        this.account = account;
        this.amount = amount;
    }

    @Override
    public void run() {
        account.withdraw(amount);
    }
}

public class BankMain {

    public static void main(String[] args) throws InterruptedException {
        BankAccount account = new MyBankAccount(1000);

        Thread t1 = new Thread(new WithdrawTask(account, 800), "t1");
        Thread t2 = new Thread(new WithdrawTask(account, 800), "t2");

        t1.start();
        t2.start();

        sleep(500);
        log("t1 state: " + t1.getState());
        log("t2 state: " + t2.getState());

        t1.join();
        t2.join();
        log("최종 잔액: " + account.getBalance());
    }
}
```

MyBankAccount의 withdraw(), getBalance() 메서드에서 synchronized를 빼고 실행하면, t1, t2 모두 출금이 되고 잔고가 -600이 남는다.   
잔고를 변경하는 withdraw() 메서드의 영역은 임계영역 이므로 한 번에 하나의 스레드만 동작해야 하고 이를 위해 synchronized 를 withdraw() 메서드에 추가한다.   
<br/>
모든 객체(인스턴스)는 내부에 자신만의 모니터 락을 갖고 있다.   
스레드들은 객체의 락을 얻기 위해 경합하고 한 스레드가 락을 얻으면 그 외 다른 스레드들은 락을 얻을 때 까지 BLOCKED 상태로 대기한다.    
BLOCKED 상태가 되면 락을 다시 획득하기 전까지는 계속 대기하고, CPU 실행 스케줄링에 들어가지 않는다.   
락 획득을 대기하는 스레드는 자동으로 락을 획득한다. 그러나 락을 획득하는 순서는 보장되지 않는다.   
<br/>
참고로 volatile를 사용하지 않아도 synchronized 안에서 접근하는 변수의 메모리 가시성 문제는 해결된다.    
synchronized는 코드 블럭으로 설정해 적용할 수도 있다.
<br/>
synchronized 단점
- 무한 대기: BLOCKED 상태의 스레드는 락이 풀릴 때 까지 무한 대기한다.
  - 특정 시간까지만 대기하는 타임아웃 X
  - 중간에 인터럽트 X
- 공정성: 락이 돌아왔을 때 BLOCKED 상태의 여러 스레드 중에 어떤 스레드가 락을 획득할 지 알 수 없다. 최악의 경우 특정 스레드가 너무 오랜기간 락을 획득하지 못할 수 있다.
