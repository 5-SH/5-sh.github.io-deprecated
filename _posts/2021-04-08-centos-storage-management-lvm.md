---
layout: post
title: 스토리지 관리와 LVM
date: 2021-04-30 19:40:00 +0900
categories: Linux
ref: linux, lvm
---

# 스토리지 관리와 LVM
  출처: https://youngmind.tistory.com/entry/CentOS-%EA%B0%95%EC%A2%8C-PART-1-8-%EC%8A%A4%ED%86%A0%EB%A6%AC%EC%A7%80-%EA%B4%80%EB%A6%AC-%E3%85%A3%E3%85%8D

  LVM 은 Logical Volume Manager 로, centos 에서 기본으로 제공되는 볼륨 매니저이다.
  LVM 은 디스크를 논리적으로 구성해 논리적인그룹들을 묶거나 유연하게 확장 또는 제거 할 수 있도록 도와준다.
![image](https://user-images.githubusercontent.com/13375810/114013764-e0e28e80-98a2-11eb-891e-6e6ed16e93b9.png)

  centos 최초 설치 시 자동 파티셔닝을 설정하면 자동으로 LVM 이 설정되고   
  50GB 디스크 3개를 Thin Provisioning 으로 추가하면 아래와 같이 변경된다.

![image](https://user-images.githubusercontent.com/13375810/114014083-2f902880-98a3-11eb-8193-bc041af167f7.png)  

![image](https://user-images.githubusercontent.com/13375810/114014233-5a7a7c80-98a3-11eb-9c8d-26e49e58970d.png)

![image](https://user-images.githubusercontent.com/13375810/114014536-b0e7bb00-98a3-11eb-9f57-c94a5bf9fac6.png)

## 1. 디스크 파티셔닝
![image](https://user-images.githubusercontent.com/13375810/114014675-d1177a00-98a3-11eb-8b06-73af8f193dbe.png)   

  fdisk 명령어로 파티셔닝을 수행한다.
![image](https://user-images.githubusercontent.com/13375810/114014814-fb693780-98a3-11eb-9699-de4c81e6c8a8.png)

![image](https://user-images.githubusercontent.com/13375810/114014873-0a4fea00-98a4-11eb-95dd-fba6bf4f7384.png)

![image](https://user-images.githubusercontent.com/13375810/114014962-25baf500-98a4-11eb-99e2-e0e955c62a9f.png)

![image](https://user-images.githubusercontent.com/13375810/114015256-73cff880-98a4-11eb-84e6-7aa7a662b31c.png)

![image](https://user-images.githubusercontent.com/13375810/114015302-821e1480-98a4-11eb-9812-c5ee97510f07.png)

  파티셔닝이 완료된 후 디스크는 전체 4개지만, /dev/sda 와 /dev/sdd 에는 2개의 파티셔닝으로 분할했다.

## 2. PV (Physical Volume) 구성
  PV 현황을 조회한다.
![image](https://user-images.githubusercontent.com/13375810/114015655-e3de7e80-98a4-11eb-8585-f6e29dd730d8.png)
   
  생성한 파티셔닝에 따라 PV 를 생성한다.
![image](https://user-images.githubusercontent.com/13375810/114015719-fe185c80-98a4-11eb-8e65-aadd321e6058.png)
   
## 3. VG (Volume Group) 구성
  PV 에서 생성된 볼륨을 그룹화 하는 단계이다.   
  사용되는 명령어   
  > - vgdisplay, vgs, vgscan : 현재 VG 에 대한 정보 출력   
  > - pvdisplay : 현재 VG/PV 에 할당된 정보를 출력   
  > - vgextended "vggroup" "pv name" : 기존 생성된 VG 에 신규 PV 를 추가   
  >  - vgcreate addvg /dev/sdd1 /dev/sdd2 : 새로운 VG 를 생성   
  >  - vgchange -a y addvg : 생성된 VG 를 적용해 활성화   

![image](https://user-images.githubusercontent.com/13375810/114016609-fe652780-98a5-11eb-98b5-0f921ad01e59.png)

![image](https://user-images.githubusercontent.com/13375810/114016691-10df6100-98a6-11eb-9192-f1d066538ffd.png)

![image](https://user-images.githubusercontent.com/13375810/114016774-281e4e80-98a6-11eb-9666-06547e91670f.png)

## 4. LV (Logical Volume) 구성
  생성된 VG 그룹에 LV 를 할당하거나 이미 할당된 LV 의 크기를 조절한다.   
  설치때 자동으로 구성된 centos VG 에 할당이 된 LV 가운데 /home 을 40G 에서 90G 로 확장한다.
  사용되는 명령어
  > - lvdisplay, lvscan, las : 현재 VG 에 대한 정보를 출력
  > - pvdisplay : 현재 VG / PV 에 할당된 정보를 출력
  > - lvextend -L +48.99G /dev/centos/home : 기존 생성된 LV 의 디스크 용량을 확장
  > - lvcreate centos -L 50G -n home2: 새로운 LV 를 생성하고 용량을 구성

![image](https://user-images.githubusercontent.com/13375810/114017375-e641d800-98a6-11eb-9443-3f0735cf288c.png)

![image](https://user-images.githubusercontent.com/13375810/114017421-f35ec700-98a6-11eb-884e-8b74b247e7a3.png)

![image](https://user-images.githubusercontent.com/13375810/114017472-02457980-98a7-11eb-8f6d-1e99a1a0c2ac.png)

![image](https://user-images.githubusercontent.com/13375810/114017537-17baa380-98a7-11eb-8d81-5abdbe0b36ad.png)

  신규 LV 를 추가하고 사이즈를 할당한다.
![image](https://user-images.githubusercontent.com/13375810/114017622-36b93580-98a7-11eb-93cc-29617f245d98.png)

![image](https://user-images.githubusercontent.com/13375810/114017666-420c6100-98a7-11eb-845e-23d8718c48a8.png)

## 5. File System 구성
  파티셔닝과 LVM 에서 물리적 볼륨으로 인식하는 PV, PV 를 그룹화한 VG, VG 를 논리적으로
  할당하는 LV 가 구성이 완료하면 디스크 구성은 완료한 것이다.   
  이제 논리적 디스크에 파일 시스템을 적용하고 마운트를 하면 사용할 수 있다.   
  사용되는 명령어
  > - mkfs -f "filesystem type" : ext4 또는 xfs 파일시스템으로 LV 를 구성
  > - lsblk -f : 파일시스템 구성 현황
  > - mount : LV 를 시스템에 마운트
  > - df -h : 마운트 구성 현황   

![image](https://user-images.githubusercontent.com/13375810/114017948-a5968e80-98a7-11eb-85c7-7e94d22f12ad.png)  

![image](https://user-images.githubusercontent.com/13375810/114017995-b515d780-98a7-11eb-8498-8c9e7ccc20e0.png)

![image](https://user-images.githubusercontent.com/13375810/114018027-be9f3f80-98a7-11eb-983f-980d6fbe5410.png)

![image](https://user-images.githubusercontent.com/13375810/114018068-cbbc2e80-98a7-11eb-92b0-84e718681454.png)

![image](https://user-images.githubusercontent.com/13375810/114018112-dbd40e00-98a7-11eb-8874-a716f1100eb6.png)

## 6. /etc/fstab 등록
  리부팅 이후에도 마운트된 디스크를 사용할 수 있도록 /etc/fstab 에 등록한다.
![image](https://user-images.githubusercontent.com/13375810/114018273-03c37180-98a8-11eb-9ada-0521984b0a04.png)

출처: https://youngmind.tistory.com/entry/CentOS-%EA%B0%95%EC%A2%8C-PART-1-8-%EC%8A%A4%ED%86%A0%EB%A6%AC%EC%A7%80-%EA%B4%80%EB%A6%AC-%E3%85%A3%E3%85%8D
