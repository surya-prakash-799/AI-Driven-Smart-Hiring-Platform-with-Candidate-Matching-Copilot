import os
import sys
import uvicorn

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("ENVIRONMENT", "development") == "development"

    print("\n" + "=" * 60)
    print("AI Recruitment Copilot Backend Server Starting...")
    print(f"Access API Docs (Swagger): http://{host}:{port}/docs")
    print(f"Access Health Check:       http://{host}:{port}/health")
    print("=" * 60 + "\n")
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
    )

