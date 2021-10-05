---
layout: post
title: 프로세스와 스레드
date: 2021-10-05 23:00:00 + 0900
categories: Linux
ref: linux, process, thread
---

# 프로세스와 스레드

## 1. 프로세스
- 프로세스 컨트롤 블록(PCB) : 프로세스를 관리하기 위해 커널에서 사용하는 자료구조
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/136038529-03d33917-420f-4ae6-8680-88cd99fea9c8.png" />
  <figcaption>출처 - https://enlqn1010.tistory.com/26</figcaption>
</figure>

- 프로세스 상태
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/136038979-ea3129cc-1612-45c3-9b77-8ba82e3782dd.jpg" />
  <figcaption>출처 - https://rebas.kr/852</figcaption>
</figure>

- PCB pointer : 커널에서 실행 중인 프로세스는 이중 연결 리스트로 표현된다.   
커널은 현재 실행 중인 프로세스의 pointer 를 유지한다.

- 프로세스는 단기 스케줄러에 의해 컨텍스트 스위칭을 당하는데 이때 컨텍스트는 PCB 에 저장된다.   
컨텍스트 스위칭은 컴퓨팅 리소스가 많이 드는 작업이다.

```c
main() {
  ...
  int pid = fork();
  if (pid < 0) // 에러
  if (pid > 0) wait(); // 자식 프로세스가 끝나길 기다림
  if (pid == 0) exelp("/bin/ls", "ls", NULL); // 자식프로세스에서 다른 프로세스를 실행
  
  return 0;
}
```

## 2. 스레드
- 멀티스레딩으로 한 스레드가 블로킹 되어도 다른 스레드가 요청을 응답할 수 있다.
- 프로세스 간에 통신하려면 메모리를 공유하거나 IPC 로 통신해야 하지만,   
스레드는 자원을 공유한다.(JVM 의 mehod area, heap area)
- 프로세스에 비해 생성 오버헤드가 적다.
- 프로세스의 컨텍스트 스위칭에 비해 전환에 오버헤드가 적다.
- 멀티 코어 프로그래밍 : 한 코어는 한 번에 한 스레드만 실행 가능하다. 멀티 코어를 사용하면   
시스템이 멀티 스레드를 각 코어에 배정할 수 있어 스레드들이 병렬적으로 실행 가능하다.
- 커널 스레드, 사용자 스레드
  - 커널 스레드는 운영체제에 의해, 사용자 스레드는 프로세스에 의해 관리된다.
  - 사용자 스레드는 커널 스레드를 배정 받아 실행된다.
  - 대부분의 운영체제들은 일대일 모델을 사용한다. 
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/136040819-a0b6369d-2477-4718-9702-1c39468ecc02.png" />
  <figcaption></figcaption>
</figure>

- 스케줄러 액티베이션
  - 커널 스레드와 사용자 스레드 lib 의 통신 방법이다.
  - 사용자 스레드는 커널 스레드에서 제공하는 LWP(Light Weight Process) 위에서 동작한다.
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/136041449-88d9ea0a-d535-4feb-a32f-dd732dd3ecb6.png" />
  <figcaption></figcaption>
</figure>