---
layout: post
title: GDB 를 통해 메모리 덤프하기
date: 2021-04-23 16:10:00 + 0900
categories: Dev
ref: Dev, linux
---

# GDB 를 통해 메모리 덤프하기
  메모리 누수가 의심되는 경우 메모리 덤프를 통해 누수가 있는 곳을 찾아야 한다.   
  gdb 를 이용해 데이터가 쌓이는 부분을 메모리를 덤프를 하면 누수의 원인을 찾는데 도움이 된다.   

  메모리 누수가 발생하는 process 의 pid 를 찾아 smaps 명령어로 메모리 할당을 확인한다.    
  __cat /proc/`<pid`>/smaps__   

![Screenshot_20210423-165602_Samsung Internet](https://user-images.githubusercontent.com/13375810/115838581-cc7ec400-a454-11eb-9b8f-b9137bccf373.jpg)

  이 부분을 gdb 를 이용해 메모리 덤프를 뜬다. 아래 명령어로 gdb 접속후 메모리 덤프 명령어를 실행한다.   
  __gdb -p `<pid`>__   
  __dump memory `<덤프를 저장할 위치`> `<메모리 시작 주소`> `<메모리 끝 주소`>__
  ex) dump memory /root/dump_1 0x7fbbc689a000 0x7fbbc77ac000   
     
  그리고 덤프가 완료되면 파일을 strings 명령어로 확인 할 수 있다가
  __strings /root/dump_1__
 
