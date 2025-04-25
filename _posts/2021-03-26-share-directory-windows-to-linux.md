---
layout: post
title: 공유 폴더 설정 (window  -> linux)
date: 2021-03-26 12:36:00 +0900
categories: [linux]
tags: [linux]
---
# 공유 폴더 설정 (window  -> linux)

### 1. 윈도우 공유 폴더 설정   
> 위도우에서 공유 폴더를 설정하고 linux user name 과 동일한 ID 로 계정 생성 후 공유 권한을 준다.   
읽기, 쓰기 권한이 모두 필요한지 확인한다.   

### 2. cifs 설치   
> 윈도우는 파일 공유를 위해 cifs 를 사용하고 리눅스는 nfs 를 사용한다. 윈도우에서 cifs 로 파일을 공유하기 때문에   
리눅스에서는 cifs 를 사용해 공유를 받아야 한다.   
이를 위해 **yum install cifs** 로 리눅스에 cifs 를 설치한다.   
   
### 3. samba 란?
> samba 는 윈도우 네트워크 파일 시스템에서 사용하는 표준 프로토콜인 smb 와 cifs 를 다시 구현해 윈도우에서 리눅스의   
자원을 공유 받을 수 있고, 리눅스에서 윈도우의 자원을 공유 받을 수 있다.   
리눅스 쪽에서 파일 서버로 동작하며 여러 운영체제 간에 TCP/IP 를 이용해 자원을 공유할 수 있어 FTP 를 대체하는 파일 서버로 사용된다.   
윈도우에서 공유하는 파일을 리눅스에서 접근할 때 cifs 로 마운트만 하면 되기 때문에 굳이 설치해 파일 서버를 만들 필요는 없다.

### 4. linux 폴더에 cifs 로 마운트
> - **mount -t cifs -o user='사용자이름',password='패스워드' //서버주소/공유폴더 마운트경로**   
ex) mount -f cifs -o user=root,password=root //10.240.123.10/share /root/cifs/share   
> - **mount -a** : fstab 에 작성된 모든 파일 시스템을 자동으로 마운트 한다   
> - **umount -v 마운트경로** : 마운트 지점을 사용해 언마운트   
디바이스가 사용 중 이라면 'device is busy' 라는 메세지가 출력되면서 언마운트가 안될 수 있다.   
-l 옵션을 사용하면 lazy mount 로 디바이스가 사용되지 않을 때 까지 기다린 후 언마운트 한다.

### 5. 부팅 시 자동 마운트 되도록 등록 
> **/etc/fstab** 에 마운트 스크립트를 추가하면 부팅 시 자동으로 마운트한다.   
vim /etc/fstab 으로 아래 스크립트를 추가한다   
ex) //10.240.123.10/share /root/cifs/share cifs username=root,password=root 0 0
