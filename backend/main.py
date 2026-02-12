from typing import List, Optional, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Integer, Text, ForeignKey, Date, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
import os
from pydantic import BaseModel

# --- Database Setup ---
DATABASE_URL = "sqlite:///./ecosystem.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Models ---

class Demand(Base):
    __tablename__ = "demands"
    id = Column(String, primary_key=True, index=True)
    category = Column(String)
    customer_name = Column(String)
    industry = Column(String)
    project_name = Column(String)
    project_types = Column(JSON, default=[]) # Stored as JSON array
    budget = Column(String)
    deadline = Column(String) # Stored as ISO string
    source = Column(String)
    description = Column(Text)
    painpoints = Column(Text)
    status = Column(String)
    owner = Column(String)
    created_at = Column(String, default=datetime.now().isoformat)
    updated_at = Column(String, default=datetime.now().isoformat)

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(String, primary_key=True, index=True)
    demand_id = Column(String, index=True) # Soft link or FK
    clarity = Column(Integer)
    complexity = Column(String)
    product_form = Column(String)
    estimated_days = Column(Integer)
    analyst = Column(String)
    core_functions = Column(Text)
    conclusion = Column(Text)
    status = Column(String)
    created_at = Column(String, default=datetime.now().isoformat)

class Partner(Base):
    __tablename__ = "partners"
    id = Column(String, primary_key=True, index=True)
    company_name = Column(String)
    company_size = Column(String)
    industries = Column(JSON, default=[]) 
    skills = Column(JSON, default=[])
    project_types = Column(JSON, default=[])
    history_count = Column(Integer, default=0)
    quality_score = Column(Integer, default=3)
    available_staff = Column(Integer, default=0)
    schedule = Column(String)
    cooperation_status = Column(String)
    contact = Column(String)
    phone = Column(String)
    notes = Column(Text)

class Matching(Base):
    __tablename__ = "matchings"
    id = Column(String, primary_key=True, index=True)
    group_id = Column(String)
    demand_id = Column(String)
    partner_id = Column(String)
    rank = Column(Integer)
    tech_score = Column(Integer)
    industry_score = Column(Integer)
    scale_score = Column(Integer)
    schedule_score = Column(Integer)
    total_score = Column(Integer)
    cooperation_mode = Column(String)
    reason = Column(Text)
    risks = Column(Text)
    product_score = Column(Integer, nullable=True)
    product_comment = Column(Text, nullable=True)
    product_score_by = Column(String, nullable=True)
    product_score_time = Column(String, nullable=True)
    presales_score = Column(Integer, nullable=True)
    presales_comment = Column(Text, nullable=True)
    presales_score_by = Column(String, nullable=True)
    presales_score_time = Column(String, nullable=True)
    status = Column(String)
    match_date = Column(String, default=datetime.now().isoformat)

class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    color = Column(String)
    created_at = Column(String, default=datetime.now().isoformat)

# Create tables
Base.metadata.create_all(bind=engine)

# --- Pydantic Schemas ---
# For simplicity, using one schema for creation and reading usually, or generic dicts
class DemandSchema(BaseModel):
    id: str
    category: Optional[str] = None
    customerName: str
    industry: Optional[str] = None
    projectName: str
    projectTypes: List[str] = []
    budget: Optional[str] = None
    deadline: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    painpoints: Optional[str] = None
    status: str
    owner: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        orm_mode = True
        alias_generator = lambda s: ''.join(word.title() if i > 0 else word for i, word in enumerate(s.split('_')))
        allow_population_by_field_name = True

class AnalysisSchema(BaseModel):
    id: str
    demandId: str
    clarity: int
    complexity: str
    productForm: str
    estimatedDays: int
    analyst: str
    coreFunctions: Optional[str] = None
    conclusion: Optional[str] = None
    status: str
    created_at: Optional[str] = None

    class Config:
        orm_mode = True
        # Custom alias mapping
        fields = {'demandId': 'demand_id', 'productForm': 'product_form', 'estimatedDays': 'estimated_days', 'coreFunctions': 'core_functions'}
        allow_population_by_field_name = True

class PartnerSchema(BaseModel):
    id: str
    companyName: str
    companySize: str
    industries: List[str] = []
    skills: List[str] = []
    projectTypes: List[str] = []
    historyCount: int
    qualityScore: int
    availableStaff: int
    schedule: str
    cooperationStatus: str
    contact: str
    phone: str
    notes: Optional[str] = None

    class Config:
        orm_mode = True
        fields = {'companyName': 'company_name', 'companySize': 'company_size', 'historyCount': 'history_count', 'qualityScore': 'quality_score', 'availableStaff': 'available_staff', 'cooperationStatus': 'cooperation_status'}
        allow_population_by_field_name = True

class MatchingSchema(BaseModel):
    id: str
    groupId: str
    demandId: str
    partnerId: str
    rank: int
    techScore: int
    industryScore: int
    scaleScore: int
    scheduleScore: int
    totalScore: int
    cooperationMode: str
    reason: Optional[str]
    risks: Optional[str]
    productScore: Optional[int]
    productComment: Optional[str]
    productScoreBy: Optional[str]
    productScoreTime: Optional[str]
    presalesScore: Optional[int]
    presalesComment: Optional[str]
    presalesScoreBy: Optional[str]
    presalesScoreTime: Optional[str]
    status: str
    matchDate: Optional[str]

    class Config:
        orm_mode = True
        fields = {
            'groupId': 'group_id', 'demandId': 'demand_id', 'partnerId': 'partner_id', 
            'techScore': 'tech_score', 'industryScore': 'industry_score', 'scaleScore': 'scale_score', 'scheduleScore': 'schedule_score', 'totalScore': 'total_score',
            'cooperationMode': 'cooperation_mode', 'productScore': 'product_score', 'productComment': 'product_comment', 'productScoreBy': 'product_score_by',
            'productScoreTime': 'product_score_time', 'presalesScore': 'presales_score', 'presalesComment': 'presales_comment', 'presalesScoreBy': 'presales_score_by',
            'presalesScoreTime': 'presales_score_time', 'matchDate': 'match_date'
        }
        allow_population_by_field_name = True

class ActivitySchema(BaseModel):
    text: str
    color: str
    time: Optional[str] = None # Mapping created_at to time for frontend compat

    class Config:
        orm_mode = True
        
# --- App ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Routes ---

@app.get("/api/demands", response_model=List[DemandSchema])
def read_demands(db: Session = Depends(get_db)):
    return db.query(Demand).all()

@app.post("/api/demands", response_model=DemandSchema)
def create_demand(demand: DemandSchema, db: Session = Depends(get_db)):
    db_demand = Demand(
        id=demand.id, category=demand.category, customer_name=demand.customerName, industry=demand.industry,
        project_name=demand.projectName, project_types=demand.projectTypes, budget=demand.budget,
        deadline=demand.deadline, source=demand.source, description=demand.description, painpoints=demand.painpoints,
        status=demand.status, owner=demand.owner, created_at=demand.createdAt or datetime.now().isoformat(),
        updated_at=demand.updatedAt or datetime.now().isoformat()
    )
    db.add(db_demand)
    db.commit()
    db.refresh(db_demand)
    return db_demand

@app.put("/api/demands/{id}")
def update_demand(id: str, demand: DemandSchema, db: Session = Depends(get_db)):
    db_item = db.query(Demand).filter(Demand.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    # Manual update mapping
    db_item.category = demand.category
    db_item.customer_name = demand.customerName
    db_item.industry = demand.industry
    db_item.project_name = demand.projectName
    db_item.project_types = demand.projectTypes
    db_item.budget = demand.budget
    db_item.deadline = demand.deadline
    db_item.source = demand.source
    db_item.description = demand.description
    db_item.painpoints = demand.painpoints
    db_item.status = demand.status
    db_item.owner = demand.owner
    db_item.updated_at = datetime.now().isoformat()
    
    db.commit()
    return db_item

@app.delete("/api/demands/{id}")
def delete_demand(id: str, db: Session = Depends(get_db)):
    db.query(Demand).filter(Demand.id == id).delete()
    db.query(Analysis).filter(Analysis.demand_id == id).delete()
    db.query(Matching).filter(Matching.demand_id == id).delete()
    db.commit()
    return {"ok": True}

# --- Analysis Routes ---
@app.get("/api/analyses", response_model=List[AnalysisSchema])
def read_analyses(db: Session = Depends(get_db)):
    return db.query(Analysis).all()

@app.post("/api/analyses", response_model=AnalysisSchema)
def create_analysis(item: AnalysisSchema, db: Session = Depends(get_db)):
    db_item = Analysis(
        id=item.id, demand_id=item.demandId, clarity=item.clarity, complexity=item.complexity,
        product_form=item.productForm, estimated_days=item.estimatedDays, analyst=item.analyst,
        core_functions=item.coreFunctions, conclusion=item.conclusion, status=item.status,
        created_at=item.created_at or datetime.now().isoformat()
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/analyses/{id}")
def update_analysis(id: str, item: AnalysisSchema, db: Session = Depends(get_db)):
    db_item = db.query(Analysis).filter(Analysis.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
    
    db_item.clarity = item.clarity
    db_item.complexity = item.complexity
    db_item.product_form = item.productForm
    db_item.estimated_days = item.estimatedDays
    db_item.analyst = item.analyst
    db_item.core_functions = item.coreFunctions
    db_item.conclusion = item.conclusion
    db_item.status = item.status
    
    db.commit()
    return db_item

# --- Partners Routes ---
@app.get("/api/partners", response_model=List[PartnerSchema])
def read_partners(db: Session = Depends(get_db)):
    return db.query(Partner).all()

@app.post("/api/partners", response_model=PartnerSchema)
def create_partner(item: PartnerSchema, db: Session = Depends(get_db)):
    db_item = Partner(
        id=item.id, company_name=item.companyName, company_size=item.companySize,
        industries=item.industries, skills=item.skills, project_types=item.projectTypes,
        history_count=item.historyCount, quality_score=item.qualityScore, available_staff=item.availableStaff,
        schedule=item.schedule, cooperation_status=item.cooperationStatus, contact=item.contact,
        phone=item.phone, notes=item.notes
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/partners/{id}")
def update_partner(id: str, item: PartnerSchema, db: Session = Depends(get_db)):
    db_item = db.query(Partner).filter(Partner.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    db_item.company_name = item.companyName
    db_item.company_size = item.companySize
    db_item.industries = item.industries
    db_item.skills = item.skills
    db_item.project_types = item.projectTypes
    db_item.history_count = item.historyCount
    db_item.quality_score = item.qualityScore
    db_item.available_staff = item.availableStaff
    db_item.schedule = item.schedule
    db_item.cooperation_status = item.cooperationStatus
    db_item.contact = item.contact
    db_item.phone = item.phone
    db_item.notes = item.notes
    
    db.commit()
    return db_item

# --- Matching Routes ---
@app.get("/api/matchings", response_model=List[MatchingSchema])
def read_matchings(db: Session = Depends(get_db)):
    return db.query(Matching).all()

@app.post("/api/matchings", response_model=MatchingSchema)
def create_matching(item: MatchingSchema, db: Session = Depends(get_db)):
    db_item = Matching(
        id=item.id, group_id=item.groupId, demand_id=item.demandId, partner_id=item.partnerId,
        rank=item.rank, tech_score=item.techScore, industry_score=item.industryScore,
        scale_score=item.scaleScore, schedule_score=item.scheduleScore, total_score=item.totalScore,
        cooperation_mode=item.cooperationMode, reason=item.reason, risks=item.risks,
        product_score=item.productScore, product_comment=item.productComment, product_score_by=item.productScoreBy,
        product_score_time=item.productScoreTime, presales_score=item.presalesScore,
        presales_comment=item.presalesComment, presales_score_by=item.presalesScoreBy,
        presales_score_time=item.presalesScoreTime, status=item.status,
        match_date=item.matchDate or datetime.now().isoformat()
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/matchings/{id}")
def update_matching(id: str, item: MatchingSchema, db: Session = Depends(get_db)):
    db_item = db.query(Matching).filter(Matching.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Matching not found")
    
    db_item.status = item.status
    db_item.product_score = item.productScore
    db_item.product_comment = item.productComment
    db_item.product_score_by = item.productScoreBy
    db_item.product_score_time = item.productScoreTime
    db_item.presales_score = item.presalesScore
    db_item.presales_comment = item.presalesComment
    db_item.presales_score_by = item.presalesScoreBy
    db_item.presales_score_time = item.presalesScoreTime
    db_item.cooperation_mode = item.cooperationMode
    db_item.reason = item.reason
    db_item.risks = item.risks
    
    db.commit()
    return db_item

# --- Activities Routes ---
@app.get("/api/activities", response_model=List[ActivitySchema])
def read_activities(db: Session = Depends(get_db)):
    activities = db.query(Activity).order_by(Activity.id.desc()).limit(20).all()
    # Map created_at to time
    return [ActivitySchema(text=a.text, color=a.color, time=a.created_at) for a in activities]

@app.post("/api/activities")
def create_activity(item: ActivitySchema, db: Session = Depends(get_db)):
    db_item = Activity(text=item.text, color=item.color, created_at=item.time or datetime.now().isoformat())
    db.add(db_item)
    db.commit()
    return {"ok": True}

# --- Store Sync Endpoint (Load all data) ---
@app.get("/api/store")
def get_full_store(db: Session = Depends(get_db)):
    """Return an object compatible with the frontend Store"""
    demands = read_demands(db)
    analyses = read_analyses(db)
    partners = read_partners(db)
    matchings = read_matchings(db)
    activities = read_activities(db)
    
    # Needs to serialize correctly (Pydantic objects to dicts)
    return {
        "demands": [d.dict(by_alias=True) for d in demands],
        "analyses": [a.dict(by_alias=True) for a in analyses],
        "partners": [p.dict(by_alias=True) for p in partners],
        "matchings": [m.dict(by_alias=True) for m in matchings],
        "activities": [a.dict() for a in activities]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
