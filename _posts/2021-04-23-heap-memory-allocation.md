---
layout: post
title: heap memory 는 어떻게 할당될까
date: 2021-04-23 16:10:00 + 0900
categories: Linux
ref: Dev, linux
---

# heap memory 는 어떻게 할당될까
  pmap 명령어의 결과로 할당받은 메모리 블록마다 한 줄씩 표현되어 있다.    
  메모리 블록은 네 부분의 정보로 구성되어 있다.   
  - 메모리 시작주소 : 16 자리의 Hexa 로 표현되어 있다. 즉, 64bit 16^16 = (2^4)^16 으로 표현된다.   
  - 메모리 블록의 크기를 KB 단위로 표현   
  - 권한   
  - 메모리 블록의 내용 : 디렉토리처럼 명확한 것은 이름을 나타내지만 heap 과 같은 메모리 속성은 Anoymous 를 의미하는 [anon] 으로 표현한다.   
     
   
  그렇다면 자바 실행시 -Xmx512m 과 같은 옵션으로 heap 의 크기를 512MB 로 제한한 것은 어디서 확인할 수 있을까?   
  먼저 OS 에서 프로세스의 가상 메모리와 실제 메모리의 매핑을 통해 프로그램을 실행한다.   
  가상 메모리는 프로세스마다 Virtual Address Space(VAS) 를 제공하고 VAS 의 레이아웃은 OS 에 따라 달라진다.   
  보편적인 레이아웃은 아래와 같다.   
     

![17425D244A2772C751](https://user-images.githubusercontent.com/13375810/115836162-1b772a00-a452-11eb-8104-b3728f7eab6a.png)
  
  pmap 의 결과에서도 레이아웃과 같은 규칙을 볼 수 있다. 특성에 맞게 일정한 메모리 범위에 모여 주소를 할당받는다.

![Screenshot_20210423-164248_Samsung Internet](https://user-images.githubusercontent.com/13375810/115836888-f59e5500-a452-11eb-961c-ca9fedeb3f69.jpg)

  그러나 Executable Text 를 제외하면 거의 일치하지 않고 java heap 을 포함한 대부분의 데이터가 Kernel space 에 몰려있다.   
  이것은 레이아웃이나 pmap 의 결과가 틀린 것이 아니라 OS 가 보안을 위해 address space randomization 기법을 사용하기 때문이다.   
  이는 buffer overflow 같은 해킹을 방지하기 위해 지정된 layout 과 다른 주소로 할당하는 방법을 말한다.   
  여기에서 heap 의 영역에 512MB 의 사이즈가 할당되어 있음을 알 수 있다.(0xce73f000~0xee740000)   
  java 실행시 -Xmx512m 옵션을 줬기 때문에 512MB 가 실제 사용여부와 관계 없이 이미 할당되어 있다.   
  