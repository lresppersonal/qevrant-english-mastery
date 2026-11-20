"""Fine-tune an open model on your checked examples with LoRA (runs on a free Google Colab T4 GPU).

    pip install -U "transformers>=4.46" "trl>=0.12" peft datasets bitsandbytes accelerate
    huggingface-cli login            # your own Hugging Face token, entered by you
    python training/train_lora.py --base Qwen/Qwen2.5-3B-Instruct --repo YOUR_HF_NAME/qevrant-checker

The result (a LoRA adapter merged into the base model) is pushed to your Hugging Face account.
"""
import argparse
import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

p = argparse.ArgumentParser()
p.add_argument("--base", default="Qwen/Qwen2.5-3B-Instruct")
p.add_argument("--repo", required=True, help="where to publish, e.g. yourname/qevrant-checker")
p.add_argument("--epochs", type=float, default=2)
a = p.parse_args()

tok = AutoTokenizer.from_pretrained(a.base)
model = AutoModelForCausalLM.from_pretrained(
    a.base, device_map="auto",
    quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16, bnb_4bit_quant_type="nf4"))
data = load_dataset("json", data_files={"train": "train.jsonl", "validation": "valid.jsonl"})

trainer = SFTTrainer(
    model=model, processing_class=tok, train_dataset=data["train"], eval_dataset=data["validation"],
    peft_config=LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, target_modules="all-linear", task_type="CAUSAL_LM"),
    args=SFTConfig(output_dir="out", num_train_epochs=a.epochs, per_device_train_batch_size=1, gradient_accumulation_steps=8,
                   learning_rate=2e-4, logging_steps=10, eval_strategy="epoch", save_strategy="no", fp16=True, max_length=4096),
)
trainer.train()
trainer.model.save_pretrained("adapter")

# Merge the adapter into the full-precision base model and publish it.
from peft import PeftModel
base = AutoModelForCausalLM.from_pretrained(a.base, torch_dtype=torch.float16, device_map="auto")
merged = PeftModel.from_pretrained(base, "adapter").merge_and_unload()
merged.push_to_hub(a.repo, private=True)
tok.push_to_hub(a.repo, private=True)
print(f"Published https://huggingface.co/{a.repo}")
