---
layout: post
title: V8 엔진의 heap 메모리 구조와 메모리 사용량이 계속 증가하는 이유
date: 2021-05-13 22:00:00 + 0900
categories: Nodejs
ref: Dev, linux
---

# V8 엔진의 heap 메모리 구조와 메모리 사용량이 계속 증가하는 이유

## 1. V8 엔진의 heap 메모리 구조
V8 엔진의 heap 메모리 구조는 아래와 같다.   
![Screenshot_20210513-211425_Samsung Internet](https://user-images.githubusercontent.com/13375810/118124211-3d9c1080-b430-11eb-8066-3c196978b19a.jpg)

- __New Space(Young generation)__ : 새로운 객체나 짧은 시간 유효한 객체들이 저장되는 메모리 공간이다. 상대적으로 작은 크기의 메모리 공간이며, 두 개의 Semi Space(From Space, To Space) 로 구성되어 있다. 이 공간은 Minior GC(Scavenger) 에 의해 관리된다. 1MB 크기의 Memory Page 로 구성되어있다.   
- __Old Space(Old generation)__ : New Space 의 Minor GC 이후 살아남은 객체들이 이동하는 메모리 공간이다. Major GC(Mark-Sweep & Compact) 에 의해 관리되며 이 공간의 크기는 --max_old_space_size 로 설정할 수 있다. 이 영역은 다른 객체를 가리키는 포인터가 저장되는 Old Pointer Space 와 객체 데이터가 저장되는 Old Data Space 로 구성되어 있다. New Space 의 Minor GC 에서 두 번 살아남은 객체는 Old Data Space 로 이동한다. 1MB 크기의 Memory Page 로 구성되어있다.
- __Large Object Space__ : 다른 Space 에 저장되기 큰 객체(Memory Page size 보다 큰 객체)들이 이 메모리 공간에 저장된다. 객체의 크기가 크기 때문에 이동에 필요한 오버헤드가 크다. 따라서 GC 에 의해 이동되지 않는다.
- __Code Space__ : JIT 컴파일러가 컴파일한 코드 블록을 보관하는 메모리 영역이다. 실행 가능한 메모리가 존재하는 유일한 공간이다. 코드의 양이 커져서 Large Object Space 로 가더라도 실행가능하다.
- __Cell Space, Property Cell Space, Map Space__ : Cells, Property Cells Maps 를 가지고 있는 메모리 영역이다.

<br/>

## 2. 가비지 컬렉팅
### Minor GC (Scavenger)
상대적으로 작은 객체(1~8MB 객체)가 할당되고 할당 포인터가 New Space 의 끝에 도달하면 Minor GC 가 트리거 된다. Minor GC 과정은 Scavenger 라고 불리고 체니의 알고리즘으로 구현되어 있다. 이 과정은 빈번히 발생되고 스레드를 사용해 병렬로 동작해 매우 빠르다.   
New Space 는 To space 와 From space 로 구성되어 있다. 대부분의 할당은 From space 에서 이루어지고 From space 가 가득차면 Minor GC 에 의해 메모리 회수가 일어난다.   

> 1. To space 에 새로 할당할 메모리 공간이 부족하면 Minor GC 는 From space 와 To space 역할이 바뀐다. 그리고 참조가 끊긴 객체에 할당된 메모리 공간을 회수하고 남은 객체는 연속된 메모리 공간으로 압축하고 할당한다.
![Screenshot_20210513-214941_Samsung Internet](https://user-images.githubusercontent.com/13375810/118127839-23b0fc80-b435-11eb-9a8d-bbf92c1de179.jpg)
![Screenshot_20210513-215011_Samsung Internet](https://user-images.githubusercontent.com/13375810/118127920-34fa0900-b435-11eb-8cec-a98d942614c3.jpg)

> 2. 이후 다시 To space 에 메모리가 부족한 상황이 발생하면 To, From space 의 역할을 바꾸고 From space 에서 살아남은 객체들을 단편화를 해결해 To space 로 옮긴다. 이 때, Minor GC 에서 2 번 이상 살아남은 객체들은 Old Space 로 이동한다. 다른 객체를 참조하는 포인터를 가진 객체는 pointer space 에 Raw Data 만을 가진 객체들은 Data space 에 위치 시킨다.
![Screenshot_20210513-215426_Samsung Internet](https://user-images.githubusercontent.com/13375810/118128397-cc5f5c00-b435-11eb-8ecf-4acad91af694.jpg)
![Screenshot_20210513-215501_Samsung Internet](https://user-images.githubusercontent.com/13375810/118128460-e0a35900-b435-11eb-84bb-1d94abd06ed1.jpg)
![Screenshot_20210513-215527_Samsung Internet](https://user-images.githubusercontent.com/13375810/118128502-f1ec6580-b435-11eb-8f9e-9b8a545d6d41.jpg)

### Major GC (Mark-Sweep & Compact)
Old Space 는 메모리 공간이 큰 관계로 Scavenger 알고리즘은 메모리 과부하를 발생할 수 있어, Major GC 에는 Mark-Sweep-Compact 알고리즘을 사용한다.   
![rcjSZ0T](https://user-images.githubusercontent.com/13375810/118128698-38da5b00-b436-11eb-9214-d18afcd67440.gif)

> 1. __Marking__ : GC 가 사용 중인 객체와 사용하지 않는 객체를 식별한다. (참조 확인)
> 2. __Sweeping__ : GC 는 Heap 메모리 공간을 탐색하고 활성으로 표시되지 않은 객체의 메모리 주소를 기록한다. 기록된 공간의 메모리는 회수되어 다른 객체를 저장하는데 사용된다.
> 3. __Compact__ : Sweeping 에서 살아남은 객체가 연속적으로 할당된다. 메모리 파편화를 방지해 메모리 성능을 향상시킨다.

<br/>

## 3. Large Object Space
약 85,000 byte 이상의 크기를 가진 객체는 Large Object Space 에 저장된다열 보통 20,000 개 이상의 엔트리를 가진 배열이 저장된다. 할당된 객체들은 사이즈가 크기 때문에 GC 에 의해 이동되지 않는다. 따라서 메모리 파편화가 발생한다.   
파편화로 인해 Large Object Spacer 에 할당된 객체의 메모리가 회수되어도 회수된 객체보다 큰 객체가 할당하려면 추가로 Heap 메모리 크기를 증가 시켜야 한다. 
![674-image002](https://user-images.githubusercontent.com/13375810/118131212-30cfea80-b439-11eb-84e9-b32cc1e0c1be.gif)

<br/>

## 4. 메모리 사용량이 계속 증가하는 이유
--max_old_space_size 를 4096 으로 설정해 node.js 프로세스를 실행시켰다.   
실행된 프로세스는 메모리 누수가 있어 점점 RSS 가 증가했고 12GB 까지 확장되고 Heap 영역은 9GB 까지 늘어났다.   
--max_old_space_size 를 4096 으로 설정해 프로세스가 4~6GB 까지 메모리를 사용하다 넘어갈 경우 프로세스가 죽을 것이라 예상했지만 12GB 까지 RSS 를 사용할 때 까지 살아있었다.
<br/>

원인 파익을 위해 gdb 의 memory dump 로 Heap 영역을 확인해보니 뷰에 보내는 상태 변경 요청 객체가 매우 많이 할당되어 있었다. 그리고 프로세스가 요청을 처리를 완료했지만 뷰의 상태 변경 요청을 처리한다고 멈춰 있는 것을 확인했다.   
Heap 영역에 할당된 상태 변경 요청 객체는 프론트 뷰에서 처리하지 못해 버퍼되고 있었다. 그리고 이 객체는 사이즈가 커 Old Space 에 저장되지 않고 Large Object Space 에 할당되고 있었다.   
Large Object Space 에 할당된 객체들은 제대로 GC 되지 못했고 GC 되었어도 메모리 파편화로 인해 RSS 가 계속 증가하게 되었다.   
<br/>

--max_old_space_size 옵션은 Heap 메모리 전체 사이즈를 설정하는 것이 아닌, Old Space 크기만 설정하는 것이고 따라서 옵션 값인 4GB 이상으로 메모리가 할당 될 수 있었다. 그리고 RSS 가 계속해서 증가된 이유는 Large Object Space 의 메모리 파편화 때문이었다.