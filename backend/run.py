import sys
import uvicorn

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("AI Recruitment Copilot Backend Server Starting...")
    print("Access API Docs (Swagger): http://127.0.0.1:8000/docs")
    print("Access Health Check:       http://127.0.0.1:8000/health")
    print("Note: Open http://127.0.0.1:8000 or http://localhost:8000 in Chrome")
    print("=" * 60 + "\n")
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )

