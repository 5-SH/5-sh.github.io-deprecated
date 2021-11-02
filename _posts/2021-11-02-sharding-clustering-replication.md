---
layout: post
title: DB index
date: 2021-11-02 15:00:00 + 0900
categories: DB
ref: DB, nomailzation
---

# DB 샤딩, 클러스터링, 레플리케이션

## 1. 클러스터링

DB 서버가 다운되는 경우를 대비하기 위해 DB 서버를 여러 개로 만든다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/139803422-172d9dee-5437-4daf-8011-c1fd03029e1d.jpg" height="350"/>
  <figcaption></figcaption>
</figure>



## 2. 레플리케이션

DB 데이터가 손실되는 경우를 대비하기 위해 실제 저장소를 복제한다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/139803748-2c653f7b-2b0b-41c0-b83f-08fc5179c2af.jpg" height="400"/>
  <figcaption></figcaption>
</figure>



## 3. 샤딩

데이터가 너무 많아 검색이 느린 경우 검색 속도를 높이기 위해 테이블을 나눠서 저장한다.    

DB 자체를 나누는 것이므로 애플리케이션 레벨에서 구현한다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/139804120-b604a807-ba00-43ba-8f88-fc50c56e6cae.png" height="400"/>
  <figcaption></figcaption>
</figure>

### 3-1. 샤드 키

어떤 샤드를 선택할 지 결정하는 키.    

#### 3-1-1 해시 샤딩

해쉬 함수를 사용해 샤드 키를 결정한다. 간단하지만 샤드가 늘어나면 해쉬 함수도 바뀌어야 하고 데이터도 샤드에 재배치 되어야 한다.   

따라서 확장성이 좋지 않다.

#### 3-1-2 다이나믹 샤딩

locator service 라는 테이블로 샤드 키를 결정한다. 샤드가 추가 되어도 locater service 에 추가만 해주면 된다.   

대신 locator service 에 문제가 생기면 모든 샤드에 문제가 생길 수 있고, locator service 에 모든 요청이 몰려 병목이 생길 수 있다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/139806029-9ec3bf9f-ae23-4bc9-9b99-cd29f72d05bd.png" height="400"/>
  <figcaption></figcaption>
</figure>

### 3-2. 분할

#### 3-2-1. 수평분할

스키마가 같은 테이블을 두 개 이상의 테이블에 샤드 키 기준으로 나누어 데이터를 저장한다.

#### 3-2-2. 수직분할

테이블의 컬럼 별로 테이블을 분할해 데이터를 저장하는 방식.

### 3-3. 활용 예시

게임 서버는 많은 사용자의 요청을 받기 위해 나뉘어져 있고, DB 도 검색 속도를 높이기 위해 샤딩이 되어 MySQL 서버가 나뉘어져 있는 경우,   

각 게임 서버에서 각각의 MySQL 서버와 커넥션 풀을 맺은 구조는 많은 요청을 처리하기에 비효울 적인 구조이다.

특정 게임 서버에서 특정 MySQL 서버에 요청을 많이 하는 경우, 처리하기에 커넥션이 부족한 상황이 자주 발생한다.

이 문제를 해결하기 위해 ProxySQL 로 리퀘스트 멀티플렉싱해 문제를 해결할 수 있다.

그리고 Router DB 에 요청이 몰려 병목이 생기고 캐쉬로 해결이 어려운 경우, 샤딩이 많이 추가가 되지 않는다는 조건이 있다면   

ProxySQL 에서 해시 샤딩으로 샤딩 키를 결정해 병목 문제를 해결할 수 있다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/139807263-0726217d-7700-41d8-8569-200dbfa299e4.png"/>
  <figcaption></figcaption>
</figure>

