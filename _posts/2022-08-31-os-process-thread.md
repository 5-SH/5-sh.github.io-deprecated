---
layout: post
title: 프로세스, 스레드
date: 2022-08-31 20:00:00 + 0900
categories: [os]
tags: [os, process, thread]
---

# 프로세스, 스레드
프로세스(스레드) 는 cpu(core) 자원을 시분할해서 사용한다. -> 동시에 여러 프로그램이 동작하는 것 처럼 보인다.   

## ■ 프로세스
연산 거리, OS 관리의 단위(스케줄링 대상).   
<br/>
프로세스 -> OS 가 VMS 를 할당함.
VMS 는 code, stack, heap, data 영역으로 구성됨.
각 프로세스의 VMS 는 독립적으로 존재 -> 다른 프로세스가 접근할 수 없다.
<br/>
PCB(Process Control Block) 을 통해 관리됨.    
운영체제는 프로세스 관리에 필요한 정보를 PCB 에 담아 저장한다.   
PCB = [ PID(32bit 정수) | 실행할 코드의 주소 | 프로그램카운터 | 상태 ... ]    
<br/>
프로세스는 생성, 준비, 실행, 대기, 완료 상태를 가진다.   
프로세스가 I/O 요청을 하고 실행 상태에서 기다린다 -> Blocking     
프로세스가 I/O 요청을 하고 대기 상태로 바뀐다 -> Non-blocking


## ■ 스레드
프로세스 내 실행의 흐름으로 여러개 가질 수 있다.    
<br/>
프로세스 내 VMS 중 heap, data, code 영역을 공유하고 스레드 마다 stack 영역을 따로 가진다.   
프로세스의 메모리 영역을 공유하기 떄문에 race condition 이 발생할 수 있다.   
스레드마다 각자 고유한 Thread Local Stroage 를 가진다.   
<br/>
리눅스에서는 스레드는 LWP 를 통해 처리되며 PID 를 가지고 스레드와 프로세스 모두 Task 라는 작업 단위로 관리된다.    
TCB(Thread Control Block) 을 통해 관리됨.    
CPU 의 core 자원은 프로세스 내 스레드를 실행한다.    

### Race condition
멀티스레드 -> 우연 -> 어떤 코어가 어떤 순서로 스레드를 실행할 지 모름    
-> OS, H/W 리소스 상태에 따라 스레드 스케줄링 결과가 달라진다.    
<br/>
Inteager 와 같은 primitive type 은 H/W 수준에서 원자성을 보장한다.   
-> 어떤 스레드1 에서 int 변수를 대입하고 있는데 스레드2 에서 갑자기 끼어들어 int 변수에 대입할 수 없다.
-> H/W 수준에서 int32 와 같은 형식의 대입은 원자성을 보장한다.
<br/>
data, heap 영역에 있는 데이터는 여러 스레드에서 공유하기 때문에 값을 변경하면 race condition 이 발생할 수 있다.    
그리고 사용자가 생성한 스레드는 메인 스레드가 종료되기 전에 종료되지 않을 수 있기 때문에    
이벤트를 통해 스레드의 실행 순서를 동기화 해야한다.

##### 출처
- https://www.youtube.com/watch?v=2i3dInwVeUM&ab_channel=%EB%84%90%EB%84%90%ED%95%9C%EA%B0%9C%EB%B0%9C%EC%9E%90TV
- https://www.youtube.com/watch?v=x-Lp-h_pf9Q&t=967s&ab_channel=%EB%84%90%EB%84%90%ED%95%9C%EA%B0%9C%EB%B0%9C%EC%9E%90TV
- OLC Kernel of Linux (Kern Koh)