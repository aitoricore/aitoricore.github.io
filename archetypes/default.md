---
date : '{{ .Date }}'
draft : false
title : '{{ replace .File.ContentBaseName "-" " " | title }}'
tags:
  - '文章'
info: |
  
---