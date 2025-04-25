---
layout: post
title: 리눅스의 fork(), exec() 시스템 콜
date: 2022-08-31 21:00:00 + 0900
categories: [os]
tags: [os, fork, exec, wait, exit, linux]
---

# 리눅스의 fork(), exec() 시스템 콜
자식 프로세스는 보통 fork(), exec() 시스템 콜을 통해 생성된다.   
부모 프로세스에서 다른 프로그램을 실행하는 자식 프로세스를 실행하려는 경우,   
(1) 자식 프로세스를 생성한다.    
(2) 자식 프로세스에서 새로운 프로그램을 생성한다.    
로 단계를 나눌 수 있다.       
(1) 단계는 fork 함수가 담당하고 (2) 단계는 exec 함수가 담당한다.    

## fork()
(1) PCB 를 생성하고 부모 프로세스의 PCB 를 복사한다    
(2) 자식 프로세스에 메모리를 할당하고 부모 프로세스의 이미지를 복사한다.    
<br/>
부모 프로세스의 PCB 를 복사했기 때문에 자식 프로세스는 부모 프로세스가    
마지막으로 실행한 부분(PCB 의 PC 값) 부터 실행한다.    
자식 프로세스는 부모 프로세스의 환경변수 값도 복사한다.    
자식 프로세스는 부모 프로세스와 PID 만 다르다.
<br/>
부모 프로세스에서 fork 함수를 실행해 반환되는 자식 프로세스의 pid 는 0 이다.    
자식 프로세스 생성에 실패하면 fork 함수는 -1 를 리턴한다.  

```c
#include <unistd.h>
#include <stdio.h>

main() 
{
  int pid;
  printf("I am Parent\n");
  pid = fork();
  if (pid == 0) // child process
    printf("I am Child\n");
  else // parent process
    // perform other work 
}

Output:
I am Parent
I am Child
```

## exec()
(1) 디스크에서 새로운 이미지를 가져온다.
(2) 디스크에서 가져온 새로운 이미지를 실행한다.    
<br/>
현재 수행 중인 프로세스의 이미지를 새로운 프로그램 이미지로 교체한다.    

```c
#include <unistd.h>
#include <stdio.h>

main() 
{
  int pid;
  printf("I am Parent\n");
  pid = fork();
  if (pid == 0) { // child process
    printf("I am Child\n");
    execlp("/bin/date", "/bin/date", (char *) 0);
  } else // parent process
    // perform other work
}

Output:
I am Parent
I am Child
2022. 08. 31. (수) 18:11:24 KST
```

## wait()
부모 프로세스가 wait 시스템 콜을 호출하면 커널은 자식 프로세스가 종료될 때 까지 부모 프로세스를 블로킹한다.     
자식 프로세스가 종료되면 커널은 부모 프로세스를 ready queue 에 추가하고     
부모 프로세스는 CPU 자원을 할당받아 준비 상태에서 실행 상태로 dispatch 된다.    

```c
#include <unistd.h>
#include <stdio.h>

main() 
{
  int pid;
  printf("I am Parent\n");
  pid = fork();
  if (pid == 0) { // child process
    printf("I am Child\n");
    execlp("/bin/date", "/bin/date", (char *) 0);
  } else // parent process
    // perform other work
  wait();  
}
```

## exit()
exit 시스템 콜을 호출하면 커널은 호출한 프로세스의 CPU 자원을 가져가고     
wait 하고있는 부모 프로세스를 깨운다.    
 
##### 출처
- https://www.youtube.com/watch?v=RzN18na94Wc&ab_channel=%EB%84%90%EB%84%90%ED%95%9C%EA%B0%9C%EB%B0%9C%EC%9E%90TV
- OLC Kernel of Linux (Kern Koh)
- geeksforgeeks.org/difference-fork-exec
