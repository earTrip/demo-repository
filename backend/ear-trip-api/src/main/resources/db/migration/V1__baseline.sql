-- Hibernate ddl-auto:update으로 운영되던 기존 스키마를 Flyway 베이스라인으로 고정.
-- Hibernate(MySQLDialect)가 실제로 생성하는 DDL을 그대로 추출해 옮김 (수기 작성 아님).

create table course (
    id bigint not null auto_increment,
    title varchar(255),
    subtitle varchar(255),
    region varchar(255),
    duration_min integer not null,
    distance_km float(53) not null,
    thumb_key varchar(255),
    primary key (id)
) engine=InnoDB;

create table product (
    code varchar(255) not null,
    name varchar(255),
    price integer not null,
    active bit not null,
    primary key (code)
) engine=InnoDB;

create table entitlement (
    id bigint not null auto_increment,
    user_id varchar(255),
    course_id bigint,
    order_id varchar(255),
    granted_at datetime(6),
    primary key (id)
) engine=InnoDB;

create table payment (
    payment_key varchar(255) not null,
    order_id varchar(255),
    amount integer not null,
    method varchar(255),
    raw_status varchar(255),
    approved_at datetime(6),
    primary key (payment_key)
) engine=InnoDB;

create table playback_event (
    id bigint not null auto_increment,
    course_id bigint,
    scene_order integer,
    session_id varchar(255),
    event_type enum ('COURSE_COMPLETE','COURSE_START','SCENE_COMPLETE','SCENE_ENTER'),
    occurred_at datetime(6),
    primary key (id)
) engine=InnoDB;

create table purchase_order (
    order_id varchar(255) not null,
    user_id varchar(255),
    product_code varchar(255),
    amount integer not null,
    status enum ('CANCELED','FAILED','PAID','PENDING'),
    created_at datetime(6),
    primary key (order_id)
) engine=InnoDB;

create table scene (
    id bigint not null auto_increment,
    course_id bigint,
    scene_order integer not null,
    title varchar(255),
    lat float(53) not null,
    lng float(53) not null,
    radius_m integer not null,
    audio_url varchar(255),
    primary key (id)
) engine=InnoDB;

create table product_course_ids (
    product_code varchar(255) not null,
    course_ids bigint
) engine=InnoDB;

alter table entitlement add constraint UK77mxguohy9nme3uyb8tdjorqb unique (user_id, course_id);
alter table product_course_ids add constraint FK6d9ethtiattxt7qpcndapehjj foreign key (product_code) references product (code);
alter table scene add constraint FKn6x7chsgmp85vcqmckjrp2e1i foreign key (course_id) references course (id);
