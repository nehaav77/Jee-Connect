New-Item -ItemType Directory -Force -Path "C:\Users\NEHAA.V\Desktop\JEE_Connect_Diagrams"
npx -y @mermaid-js/mermaid-cli -i diagram1.mmd -o "C:\Users\NEHAA.V\Desktop\JEE_Connect_Diagrams\1_Design_Workflow.png"
npx -y @mermaid-js/mermaid-cli -i diagram2.mmd -o "C:\Users\NEHAA.V\Desktop\JEE_Connect_Diagrams\2_Sequence_Diagram.png"
npx -y @mermaid-js/mermaid-cli -i diagram3.mmd -o "C:\Users\NEHAA.V\Desktop\JEE_Connect_Diagrams\3_Activity_Diagram.png"
npx -y @mermaid-js/mermaid-cli -i diagram4.mmd -o "C:\Users\NEHAA.V\Desktop\JEE_Connect_Diagrams\4_Class_Diagram.png"
Remove-Item diagram1.mmd
Remove-Item diagram2.mmd
Remove-Item diagram3.mmd
Remove-Item diagram4.mmd
